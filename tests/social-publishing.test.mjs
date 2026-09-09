import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { accounts, xReadAuthorization } from "../scripts/social-connections.mjs";
import { campaignUrl, DISCLOSURE, validateManifest, imageDimensions, safeRead } from "../scripts/social/policy.mjs";
import { makeApi, xAuthorization, safeError, SocialError, publishPlatform } from "../scripts/social/adapters.mjs";
import { executeRelease, reconcileRelease, loadLedger, recoverRecordedResults } from "../scripts/social/ledger.mjs";
import { trustedContext, verifiedDeployment, verifyLiveRelease, run } from "../scripts/social/run.mjs";
import { collectMetrics } from "../scripts/social/metrics.mjs";

const digest="a".repeat(64), commit="b".repeat(40);
const env={X_API_KEY:"test-key",X_API_SECRET:"secret-canary",X_ACCESS_TOKEN:"test-token",X_ACCESS_TOKEN_SECRET:"test-secret"};
function fixture(){
  const release={schema:"sorry-tomorrow-social-release-v1",internalId:"ST-TEST",slug:"test",title:"Test",number:11,canonicalUrl:"https://sorrytomorrow.com/comics/test/",approval3Sha256:digest,sourceManifestSha256:digest,releaseAuthoritySha256:digest,panelOrder:["p1"],platforms:{}};
  for(const p of ["x","instagram","facebook"])release.platforms[p]={accountId:p==="x"?accounts.xUserId:p==="instagram"?accounts.instagramId:accounts.facebookPageId,posts:[{text:`Test\n${campaignUrl("test",11,p)}\n${DISCLOSURE}`,media:[{path:`public/social/test/${p}/p1.${p==="instagram"?"jpg":"png"}`,sha256:digest,bytes:100,width:1000,height:1000,type:p==="instagram"?"image/jpeg":"image/png",alt:"Complete panel.",panelIds:["p1"]}]}]};
  const approved={manifestSha256:digest,approval3Sha256:digest,sourceManifestSha256:digest,releaseAuthoritySha256:digest,internalId:"ST-TEST"};
  return {release,approved,catalog:{episodes:[{internalId:"ST-TEST",slug:"test",title:"Test",publicNumber:11,art:[{}]}]},policy:{baselineExcludedIds:[],xMonthlyCapUsd:5,xReservePerPostUsd:0.5}};
}
test("approved manifest binds complete story, exact account and campaign URLs",()=>{const f=fixture();assert.equal(validateManifest(f.release,f.approved,f.catalog,f.policy),f.release);});
for(const [name,change]of [
  ["wrong account",r=>r.platforms.x.accountId="999"],
  ["missing panel",r=>r.platforms.facebook.posts[0].media[0].panelIds=[]],
  ["duplicate panel",r=>r.platforms.x.posts[0].media.push(r.platforms.x.posts[0].media[0])],
  ["PNG on Instagram",r=>r.platforms.instagram.posts[0].media[0].type="image/png"],
  ["path traversal",r=>r.platforms.x.posts[0].media[0].path="public/social/test/../private.png"],
  ["external caption link",r=>r.platforms.x.posts[0].text+= " https://elsewhere.example/"],
  ["missing disclosure",r=>r.platforms.x.posts[0].text="Test"],
  ["unapproved mention",r=>r.platforms.x.posts[0].text+=" @someone"],
  ["oversized media",r=>r.platforms.x.posts[0].media[0].bytes=5_000_001],
])test(`rejects ${name}`,()=>{const f=fixture();change(f.release);assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));});
test("baseline blocks old comics regardless of a new manifest",()=>{const f=fixture();f.policy.baselineExcludedIds.push("ST-TEST");assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));});
test("approval mismatch is not an approved boolean",()=>{const f=fixture();f.approved.approval3Sha256="c".repeat(64);assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));});
test("OAuth JSON POST signs a method-specific base; GET matches existing independent implementation",()=>{
  const opt={nonce:"fixed",timestamp:"1"},url="https://api.x.com/2/users/me";
  assert.equal(xAuthorization("GET",url,env,opt),xReadAuthorization(url,{apiKey:env.X_API_KEY,apiSecret:env.X_API_SECRET,accessToken:env.X_ACCESS_TOKEN,accessTokenSecret:env.X_ACCESS_TOKEN_SECRET},opt));
  assert.notEqual(xAuthorization("POST",url,env,opt),xAuthorization("GET",url,env,opt));
  assert.throws(()=>xAuthorization("POST","https://evil.example/2/tweets",env));
});
test("provider errors and network exceptions never echo credentials or retry",async()=>{
  let count=0;
  const api=makeApi({env,fetchImpl:async()=>{count++;return new Response(JSON.stringify({error:{code:190,message:"secret-canary"}}),{status:400});}});
  await assert.rejects(api.request("x","POST","/2/tweets",{text:"Test"}),e=>{assert.deepEqual(safeError(e),{code:"provider_rejected_request",httpStatus:400,providerCode:190});return true;});assert.equal(count,1);
  const bad=makeApi({env,fetchImpl:async()=>{throw Error("secret-canary");}});
  await assert.rejects(bad.request("x","GET","/2/users/me"),e=>!JSON.stringify(safeError(e)).includes("secret-canary"));
});
test("fork, PR, non-main and failed deployment contexts cannot access the publisher",()=>{
  const e={GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:accounts.repository,GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"workflow_run"};
  const payload={action:"completed",repository:{full_name:accounts.repository},workflow_run:{head_repository:{full_name:accounts.repository},head_branch:"main",event:"push",conclusion:"success",path:".github/workflows/pages.yml"}};
  assert.equal(trustedContext(e,payload),true);
  for(const bad of [{...e,GITHUB_REF:"refs/heads/other"},{...e,GITHUB_EVENT_NAME:"pull_request"},{...e,GITHUB_REPOSITORY:"attacker/fork"}])assert.equal(trustedContext(bad,payload),false);
  assert.equal(trustedContext(e,{...payload,workflow_run:{...payload.workflow_run,head_repository:{full_name:"attacker/fork"}}}),false);
  assert.equal(trustedContext(e,{...payload,workflow_run:{...payload.workflow_run,event:"pull_request"}}),false);
});
test("build success alone is not a verified Pages deployment",async()=>{
  const gh=async(_m,p)=>p.includes("git/ref")?{object:{sha:commit}}:p.endsWith("/jobs?per_page=100")?{jobs:[{name:"build",conclusion:"success"}]}:{workflow_runs:[{id:1,head_sha:commit,head_repository:{full_name:accounts.repository},head_branch:"main",conclusion:"success",event:"push"}]};
  await assert.rejects(verifiedDeployment(gh,commit,{}));
});
test("a stale upstream workflow does not publish a newer main checkout",async()=>{
  const gh=async(_m,p)=>p.includes("git/ref")?{object:{sha:commit}}:{head_sha:"c".repeat(40)};
  assert.equal(await verifiedDeployment(gh,commit,{workflow_run:{id:1}}),null);
});
test("a redirected or changed public asset fails before upload",async()=>{
  const f=fixture();let n=0;
  await assert.rejects(verifyLiveRelease(f.release,async(_url,opts)=>{assert.equal(opts.redirect,"error");return new Response(n++===0?'<article data-comic-slug="test">':'wrong bytes');}));
});
test("safeRead rejects symlinks escaping the checkout",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"st-social-read-"));const outside=await mkdtemp(path.join(tmpdir(),"st-social-outside-"));
  await writeFile(path.join(outside,"canary"),"private");await symlink(outside,path.join(root,"link"));await assert.rejects(safeRead(root,"link/canary"));
});
test("PNG dimensions are decoded from bytes and unknown formats fail",()=>{
  const b=Buffer.alloc(34);Buffer.from([137,80,78,71,13,10,26,10]).copy(b);b.write("IHDR",12);b.writeUInt32BE(1480,16);b.writeUInt32BE(1420,20);
  assert.deepEqual(imageDimensions(b),{type:"image/png",width:1480,height:1420});assert.throws(()=>imageDimensions(Buffer.from("pretend jpg")));
});
test("ledger absence never silently starts posting or resets a baseline",async()=>{await assert.rejects(loadLedger(async()=>null));});
test("existing attempts are never replayed, including partial and uncertain ones",async()=>{
  const f=fixture();let writes=0;
  const record={manifestSha256:digest,platforms:{x:{status:"published",verified:[{id:"1"}]},instagram:{status:"reserved",steps:{upload:{status:"in-flight"}}},facebook:{status:"reconciliation-required"}}};
  const ledger={data:{baselineExcludedIds:[],releases:{"ST-TEST":record}},save:async()=>{writes++;}};
  const result=await executeRelease({entry:{release:f.release,manifestSha256:digest},ledger,api:{request:()=>{throw Error("Unexpected API call");}},root:".",policy:f.policy});
  assert.deepEqual(result.map(r=>r.status),["already-published","reconciliation-required","reconciliation-required"]);assert.equal(writes,0);
});
test("no media write occurs when durable intent cannot be recorded",async()=>{
  const f=fixture();let calls=0;
  const ledger={data:{baselineExcludedIds:[],releases:{}},save:async()=>{throw new SocialError("github_request_failed");}};
  await assert.rejects(executeRelease({entry:{release:f.release,manifestSha256:digest},ledger,api:{request:async()=>{calls++;}},root:".",policy:f.policy}));assert.equal(calls,0);
});
test("uncertain mutation keeps durable intent and never blind-retries on another run",async()=>{
  const f=fixture();const root=await mkdtemp(path.join(tmpdir(),"st-social-engine-"));
  await mkdir(path.join(root,"public/social/test/x"),{recursive:true});await writeFile(path.join(root,f.release.platforms.x.posts[0].media[0].path),"approved test bytes");
  let calls=0,saved;
  const ledger={data:{baselineExcludedIds:[],releases:{}},save:async()=>{saved=structuredClone(ledger.data);}};
  const api={request:async()=>{calls++;throw new SocialError("network_or_redirect_outcome_unknown");}};
  await executeRelease({entry:{release:f.release,manifestSha256:digest},ledger,api,root,policy:f.policy});
  assert.equal(calls,3);assert.equal(saved.releases["ST-TEST"].platforms.x.steps["post-0-image-0"].status,"in-flight");
  await executeRelease({entry:{release:f.release,manifestSha256:digest},ledger,api,root,policy:f.policy});assert.equal(calls,3);
});
test("reconciliation without a durable published ID is read-only and stops",async()=>{
  const f=fixture();let calls=0;const ledger={data:{releases:{"ST-TEST":{manifestSha256:digest,platforms:{x:{status:"reconciliation-required",results:[]}}}}},save:async()=>{}};
  const result=await reconcileRelease({entry:{release:f.release,manifestSha256:digest},ledger,api:{request:async()=>{calls++;}}});
  assert.equal(result[0].status,"manual-reconciliation-required");assert.equal(calls,0);
});
test("Instagram AI label belongs to parent only, ordered children and alt text are explicit",async()=>{
  const f=fixture();const destination=f.release.platforms.instagram;destination.posts[0].media.push({...destination.posts[0].media[0],panelIds:["p2"],alt:"Second panel."});
  const calls=[];let id=100;
  const api={request:async(_p,method,url,body)=>{calls.push({method,url,body});return method==="GET"?{status_code:"FINISHED"}:{id:String(id++)};}};
  const results=await publishPlatform({platform:"instagram",destination,root:".",api,step:async(_n,fn)=>fn(),sleep:async()=>{}});
  assert.equal(results.length,1);assert.equal(calls[0].body.alt_text,"Complete panel.");assert.equal(calls[0].body.is_ai_generated,undefined);
  assert.deepEqual(calls[2].body.children,["100","101"]);assert.equal(calls[2].body.is_ai_generated,true);
  assert.equal(calls.at(-1).body.creation_id,"102");
});

test("reconcile recovers a saved publish ID even if the process stopped before results assignment",async()=>{
  const f=fixture(),expected=f.release.platforms.x.posts[0];let calls=0;
  const state={status:"reserved",results:[],steps:{"post-0-image-0":{status:"done",result:{id:"101",mediaKey:"3_101"}},"post-0-publish":{status:"done",result:{id:"102",url:"https://x.com/sorrytomorrowco/status/102"}}}};
  const ledger={data:{releases:{"ST-TEST":{manifestSha256:digest,platforms:{x:state}}}},save:async()=>{}};
  const api={request:async(_p,method)=>{assert.equal(method,"GET");calls++;return {data:{id:"102",author_id:accounts.xUserId,text:expected.text,attachments:{media_keys:["3_101"]}},includes:{media:[{media_key:"3_101",type:"photo",width:1000,height:1000,alt_text:"Complete panel."}]}};}};
  const result=await reconcileRelease({entry:{release:f.release,manifestSha256:digest},ledger,api});assert.equal(result[0].status,"published");assert.equal(calls,1);assert.equal(state.results[0].id,"102");
  assert.deepEqual(recoverRecordedResults({steps:{"post-0-image-0":{status:"done",result:{id:"101"}}}},f.release.platforms.x),[]);
});

test("health works without website assets or a successful newest deployment",async()=>{
  const root=await mkdtemp(path.join(tmpdir(),"st-health-"));await mkdir(path.join(root,"social"));
  await writeFile(path.join(root,"social/policy.json"),JSON.stringify({metaDataAccessExpiresAt:new Date(Date.now()+40*86400000).toISOString()}));
  const eventPath=path.join(root,"event.json");await writeFile(eventPath,JSON.stringify({repository:{full_name:accounts.repository}}));
  const calls=[];
  const fetchImpl=async url=>{calls.push(url);assert.ok(!url.includes("/actions/"));let body;
    if(url.includes("api.x.com"))body={data:{id:accounts.xUserId,username:accounts.xHandle}};
    else if(url.includes("/me?"))body={id:accounts.facebookPageId,instagram_business_account:{id:accounts.instagramId}};
    else if(url.includes("graph.facebook.com"))body={id:accounts.instagramId,username:accounts.instagramHandle};
    else body={sha:"ledger-sha",content:Buffer.from(JSON.stringify({schema:"sorry-tomorrow-social-ledger-v1",baselineExcludedIds:[],releases:{}})).toString("base64")};
    return new Response(JSON.stringify(body));};
  const report=await run({root,mode:"health",env:{...env,META_PAGE_ACCESS_TOKEN:"meta-test",GITHUB_TOKEN:"github-test",GITHUB_ACTIONS:"true",GITHUB_REPOSITORY:accounts.repository,GITHUB_REF:"refs/heads/main",GITHUB_EVENT_NAME:"schedule",GITHUB_EVENT_PATH:eventPath},fetchImpl});
  assert.equal(report.status,"passed");assert.equal(calls.length,4);
});

test("metrics keeps missing counts unavailable and never reads unverified posts",async()=>{
  const ledger={
    data:{releases:{"ST-TEST":{
      slug:"test",createdAt:new Date().toISOString(),
      platforms:{
        x:{status:"published",verified:[{id:"102",url:"https://x.com/sorrytomorrowco/status/102"}],metrics:[]},
        instagram:{status:"reconciliation-required",verified:[{id:"103"}]}
      }
    }}},
    save:async()=>{}
  };
  let calls=0;const api={request:async(_p,method)=>{assert.equal(method,"GET");calls++;return{data:{public_metrics:{like_count:0,reply_count:-1}}};}};
  const result=await collectMetrics({ledger,api});assert.equal(calls,1);assert.equal(result[0].posts[0].metrics.like_count,0);assert.equal(result[0].posts[0].metrics.impression_count,null);assert.equal(result[0].posts[0].metrics.reply_count,null);
});
