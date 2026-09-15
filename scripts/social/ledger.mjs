import assert from "node:assert/strict";
import { accounts } from "../social-connections.mjs";
import { json, hash, correctedReleaseBinding } from "./policy.mjs";
import { safeError, SocialError, publishPlatform, verifyPlatform } from "./adapters.mjs";

export const LEDGER_BRANCH="social-publication-state";
export const LEDGER_PATH="social-publication-ledger.json";

export function githubApi(env,fetchImpl=fetch) {
  assert.equal(env.GITHUB_REPOSITORY,accounts.repository);
  assert.ok(env.GITHUB_TOKEN);
  return async function request(method,endpoint,body,{allow404=false}={}) {
    assert.ok(["GET","POST","PUT"].includes(method));
    const prefix=`/repos/${accounts.repository}/`;
    assert.ok(endpoint.startsWith(prefix) && !endpoint.includes("..") && !endpoint.includes("#"));
    let r;
    try {r=await fetchImpl(`https://api.github.com${endpoint}`,{method,headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"sorry-tomorrow-release-publisher",...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:"error",signal:AbortSignal.timeout(30_000)});}
    catch {throw new SocialError("github_network_outcome_unknown");}
    if(allow404&&r.status===404)return null;
    if(!r.ok)throw new SocialError("github_request_failed",r.status);
    return r.json();
  };
}

export async function loadLedger(gh,{initialize=false,commit,policy,catalog,releases,now=new Date()}={}) {
  const prefix=`/repos/${accounts.repository}`;
  const endpoint=`${prefix}/contents/${LEDGER_PATH}`;
  let file=await gh("GET",`${endpoint}?ref=${LEDGER_BRANCH}`,undefined,{allow404:true});
  if(!file) {
    assert.ok(initialize,"Posting ledger missing: initialize explicitly before activation");
    assert.ok(/^[a-f0-9]{40}$/.test(commit));
    const selected=new Set(releases.map(r=>r.release.internalId));
    const baseline=catalog.episodes.filter(e=>!e.previewOnly&&!selected.has(e.internalId)).map(e=>e.internalId).sort();
    assert.deepEqual([...policy.baselineExcludedIds].sort(),baseline,"Refresh the already-live baseline before activation");
    const ref=await gh("GET",`${prefix}/git/ref/heads/${LEDGER_BRANCH}`,undefined,{allow404:true});
    if(!ref)await gh("POST",`${prefix}/git/refs`,{ref:`refs/heads/${LEDGER_BRANCH}`,sha:commit});
    const initial={schema:"sorry-tomorrow-social-ledger-v1",initializedAt:now.toISOString(),baselineCommit:commit,baselineExcludedIds:baseline,releases:{}};
    await gh("PUT",endpoint,{branch:LEDGER_BRANCH,message:"Initialize social publication ledger; no backfill",content:Buffer.from(json(initial)).toString("base64")});
    file=await gh("GET",`${endpoint}?ref=${LEDGER_BRANCH}`);
  }
  let sha=file.sha;
  const data=JSON.parse(Buffer.from(file.content,"base64").toString("utf8"));
  assert.equal(data.schema,"sorry-tomorrow-social-ledger-v1");
  assert.ok(Array.isArray(data.baselineExcludedIds)&&data.releases&&typeof data.releases==="object");
  return {data,async save(){
    const result=await gh("PUT",endpoint,{branch:LEDGER_BRANCH,sha,message:"Record social publication operation",content:Buffer.from(json(data)).toString("base64")});
    assert.ok(result.content?.sha);sha=result.content.sha;
  }};
}

export function resolveReleaseKey({entry, ledger, policy}) {
  const {release, manifestSha256} = entry;
  const correction = correctedReleaseBinding(entry, policy);
  if (!correction) return {key:release.internalId, correction:null};
  assert.ok(!ledger.data.baselineExcludedIds.includes(release.internalId), "Correction cannot bypass durable baseline");
  const original = ledger.data.releases[release.internalId];
  assert.ok(original, "Correction requires the original durable record");
  assert.equal(original.slug, release.slug);
  assert.equal(original.manifestSha256, correction.supersedesManifestSha256);
  assert.equal(original.withdrawal?.status, "withdrawn-do-not-republish");
  assert.equal(original.withdrawal?.executionStatus, "post-deletions-provider-confirmed");
  assert.equal(hash(json(original.withdrawal)), correction.withdrawalSha256, "Original withdrawal differs from correction authority");
  return {key:`${release.internalId}@${manifestSha256}`, correction};
}

export async function executeRelease({entry,ledger,api,root,commit,runId,policy,now=()=>new Date(),sleep}) {
  const {release,manifestSha256}=entry;
  assert.ok(!ledger.data.baselineExcludedIds.includes(release.internalId),"Backfill blocked by durable baseline");
  const {key, correction}=resolveReleaseKey({entry,ledger,policy});
  let record=ledger.data.releases[key];
  if(record?.withdrawal)return [{platform:"all",status:"withdrawn-do-not-republish"}];
  if(record){
    assert.equal(record.manifestSha256,manifestSha256,"Previously attempted comic changed; reconcile without reposting");
    if(correction)assert.deepEqual(record.correction,correction,"Saved correction authority changed");
  }
  else {
    record=ledger.data.releases[key]={slug:release.slug,title:release.title,manifestSha256,sourceCommit:commit,runId,createdAt:now().toISOString(),platforms:{},...(correction?{internalId:release.internalId,correction}: {})};
    await ledger.save();
  }
  const report=[];
  for(const platform of ["x","instagram","facebook"]) {
    const prior=record.platforms[platform];
    if(prior){report.push({platform,status:prior.status==="published"?"already-published":"reconciliation-required",posts:prior.verified??[]});continue;}
    const state=record.platforms[platform]={status:"reserved",startedAt:now().toISOString(),steps:{},results:[]};
    if(platform==="x") {
      const cutoff=now().getTime()-31*24*60*60*1000;
      const reserved=Object.values(ledger.data.releases).reduce((total,r)=>total+(Date.parse(r.platforms.x?.startedAt??"")>=cutoff?(r.platforms.x.xReservedUsd??0):0),0);
      const amount=policy.xReservePerPostUsd*release.platforms.x.posts.length;
      assert.ok(amount>0 && amount<=1.5 && policy.xMonthlyCapUsd===5);
      if(reserved+amount>4.9){state.status="blocked-budget";await ledger.save();report.push({platform,status:state.status});continue;}
      state.xReservedUsd=amount;
    }
    await ledger.save();
    const step=async(name,operation)=>{
      assert.ok(!state.steps[name],"Mutation already attempted");
      state.steps[name]={status:"in-flight",startedAt:now().toISOString()};
      await ledger.save(); // Durable intent must succeed BEFORE any external write.
      const result=await operation();
      state.steps[name]={...state.steps[name],status:"done",result,completedAt:now().toISOString()};
      await ledger.save(); // If this fails, next run sees in-flight and cannot retry.
      return result;
    };
    try {
      state.results=await publishPlatform({platform,destination:release.platforms[platform],root,api,step,sleep,correction});
      state.status="posted-awaiting-verification";await ledger.save();
      state.verified=await verifyPlatform({platform,destination:release.platforms[platform],results:state.results,api});
      state.status="published";state.verifiedAt=now().toISOString();await ledger.save();
      report.push({platform,status:"published",posts:state.verified});
    } catch(error) {
      state.status="reconciliation-required";state.error=safeError(error);
      // Never risk further writes if the authoritative ledger is unavailable.
      await ledger.save();
      report.push({platform,status:state.status,error:state.error});
    }
  }
  return report;
}

export function recoverRecordedResults(state,destination) {
  const results=[];
  for(const [p,post]of destination.posts.entries()) {
    const published=state.steps?.[`post-${p}-publish`];
    if(published?.status!=="done"||!published.result?.id)return [];
    const images=post.media.map((_,i)=>state.steps?.[`post-${p}-image-${i}`]);
    if(images.some(s=>s?.status!=="done"||!s.result?.id))return [];
    results.push({...published.result,images:images.map(s=>s.result)});
  }
  return results;
}

export async function reconcileRelease({entry,ledger,api,policy,now=()=>new Date()}) {
  const {key,correction}=resolveReleaseKey({entry,ledger,policy});
  const record=ledger.data.releases[key];
  if(record?.withdrawal)return [{platform:"all",status:"withdrawn-do-not-republish"}];
  assert.ok(record);assert.equal(record.manifestSha256,entry.manifestSha256);
  if(correction)assert.deepEqual(record.correction,correction,"Saved correction authority changed");
  const report=[];
  for(const [platform,state]of Object.entries(record.platforms)) {
    if(state.status==="published"){report.push({platform,status:"already-published",posts:state.verified});continue;}
    if(!state.results?.length)state.results=recoverRecordedResults(state,entry.release.platforms[platform]);
    if(!state.results?.length){report.push({platform,status:"manual-reconciliation-required",reason:"No durable complete post identifiers; inspect provider before any new attempt"});continue;}
    try {
      state.verified=await verifyPlatform({platform,destination:entry.release.platforms[platform],results:state.results,api});
      state.status="published";state.verifiedAt=now().toISOString();delete state.error;await ledger.save();
      report.push({platform,status:"published",posts:state.verified});
    }catch(error){report.push({platform,status:"reconciliation-required",error:safeError(error)});}
  }
  return report;
}
