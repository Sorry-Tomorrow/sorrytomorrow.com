import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { accounts } from "../scripts/social-connections.mjs";
import { hash, json, correctedReleaseBinding, validateManifest, campaignUrl, DISCLOSURE, providerMediaUrl } from "../scripts/social/policy.mjs";
import { executeRelease, reconcileRelease, resolveReleaseKey } from "../scripts/social/ledger.mjs";
import { SocialError, publishPlatform } from "../scripts/social/adapters.mjs";
import { verifyLiveRelease } from "../scripts/social/run.mjs";

const selectedPolicy = JSON.parse(await readFile(new URL("../social/policy.json", import.meta.url)));
const manifestSha256 = "0514c1e89c6b1a2b05b379cc356632dfecca6b9c54eafcbfae0e1a1fe910a585";
const internalId = "ST-ASSISTANTS-ASSISTANT", slug = "the-assistants-assistant";
function fixture() {
  const policy = structuredClone(selectedPolicy), grant = policy.correctedReleases[manifestSha256];
  const original = { slug, manifestSha256:grant.supersedesManifestSha256, platforms:{x:{status:"published",startedAt:new Date().toISOString(),xReservedUsd:0.5,steps:{published:{status:"done",id:"original"}},results:[{id:"original"}]}}, withdrawal:{status:"withdrawn-do-not-republish",executionStatus:"post-deletions-provider-confirmed"} };
  // Synthetic withdrawal for isolated tests; selected production pin is tested below.
  grant.withdrawalSha256 = hash(json(original.withdrawal));
  const release = {schema:"sorry-tomorrow-social-release-v1",internalId,slug,title:"The Assistant’s Assistant",number:12,canonicalUrl:`https://sorrytomorrow.com/comics/${slug}/`,approval3Sha256:grant.approval3Sha256,sourceManifestSha256:grant.sourceManifestSha256,releaseAuthoritySha256:grant.releaseAuthoritySha256,panelOrder:["p1"],platforms:{}};
  for (const platform of ["x","instagram","facebook"]) release.platforms[platform]={accountId:platform==="x"?accounts.xUserId:platform==="instagram"?accounts.instagramId:accounts.facebookPageId,posts:[{text:policy.exactApprovedCaptions[internalId].text,media:[{path:`public/social/${slug}/${platform}/p1.${platform==="x"?"png":"jpg"}`,sha256:"a".repeat(64),bytes:100,width:1480,height:1430,type:platform==="x"?"image/png":"image/jpeg",alt:"Selected corrected panel.",panelIds:["p1"]}]}]};
  const entry={release,manifestSha256}, approved={internalId,manifestSha256,approval3Sha256:release.approval3Sha256,sourceManifestSha256:release.sourceManifestSha256,releaseAuthoritySha256:release.releaseAuthoritySha256};
  const ledger={data:{baselineExcludedIds:[],releases:{[internalId]:original}},save:async()=>{}};
  return {policy,grant,original,entry,release,approved,ledger,key:`${internalId}@${manifestSha256}`,catalog:{episodes:[{internalId,slug,title:release.title,publicNumber:12,art:[{}]}]}};
}

test("sole production correction pins exact new authority and original withdrawal",()=>{
  assert.deepEqual(Object.keys(selectedPolicy.correctedReleases),[manifestSha256]);
  const g=selectedPolicy.correctedReleases[manifestSha256];
  assert.deepEqual(g,{schema:"sorry-tomorrow-corrected-release-v1",internalId,slug,
    approval3Sha256:"9563913a8bd68d0c1f717377350c0a219190efc5f2dad6d6406d8758551745cd",
    sourceManifestSha256:"578d0bb92b46f40985b002840f07ce2a38ad89a91cae01929523cead5f10a36e",
    releaseAuthoritySha256:"9c85570cbd2bd663437d0550ad611205da7a9498d419b6f6afda0e8ff379cb7c",
    supersedesManifestSha256:"5c541809eecdb09a2ac3c9fb2b8f489f47a6c563048c540124703343fd5ec037",
    withdrawalSha256:"7adc28adbfaca7dbd15238c2a87c309b50d5f272cc34f606571e7510202ba556"});
});
test("corrected key is derived from canonical identity and exact manifest, never caller alias",()=>{
  const f=fixture();f.entry.ledgerKey="bypass";f.release.ledgerKey="bypass";
  assert.equal(resolveReleaseKey(f).key,f.key);
  assert.equal(resolveReleaseKey({...f,policy:{}}).key,internalId);
  assert.equal(correctedReleaseBinding({...f.entry,manifestSha256:"f".repeat(64)},f.policy),null);
});
for (const field of ["internalId","slug","approval3Sha256","sourceManifestSha256","releaseAuthoritySha256"]) test(`correction rejects changed ${field}`,()=>{
  const f=fixture();f.release[field]="changed";assert.throws(()=>resolveReleaseKey(f));
});
for (const [name,change] of [
  ["missing original record",f=>delete f.ledger.data.releases[internalId]],
  ["changed original manifest",f=>f.original.manifestSha256="b".repeat(64)],
  ["changed original slug",f=>f.original.slug="other"],
  ["cleared withdrawal",f=>delete f.original.withdrawal],
  ["changed withdrawal",f=>f.original.withdrawal.extra="changed"],
  ["unfinished deletion",f=>f.original.withdrawal.executionStatus="reconciliation-required"],
  ["policy backfill baseline",f=>f.policy.baselineExcludedIds.push(internalId)],
  ["durable backfill baseline",f=>f.ledger.data.baselineExcludedIds.push(internalId)],
  ["same old and new manifest",f=>f.grant.supersedesManifestSha256=manifestSha256],
]) test(`correction cannot bypass ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>resolveReleaseKey(f));});
test("missing exact grant keeps old entry permanently blocked, even with a new manifest",async()=>{
  const f=fixture();delete f.policy.correctedReleases;
  const result=await executeRelease({...f,api:{request:()=>assert.fail("No API call")}});
  assert.deepEqual(result,[{platform:"all",status:"withdrawn-do-not-republish"}]);
  assert.equal(Object.keys(f.ledger.data.releases).length,1);
});
test("new durable record and intents preserve old history; unknown calls never retry",async()=>{
  const f=fixture(), before=json(f.original), root=await mkdtemp(path.join(tmpdir(),"st-correction-test-"));
  const file=f.release.platforms.x.posts[0].media[0].path;
  await mkdir(path.dirname(path.join(root,file)),{recursive:true});await writeFile(path.join(root,file),"test-only payload");
  let calls=0,saved;
  f.ledger.save=async()=>{saved=structuredClone(f.ledger.data);};
  const api={request:async(platform)=>{calls++;assert.equal(saved.releases[f.key].platforms[platform].steps["post-0-image-0"].status,"in-flight");throw new SocialError("network_or_redirect_outcome_unknown");}};
  await executeRelease({...f,root,api});assert.equal(calls,3);
  assert.equal(f.ledger.data.releases[f.key].platforms.x.xReservedUsd,0.5);
  assert.equal(json(f.original),before);assert.equal(json(saved.releases[internalId]),before);
  await executeRelease({...f,root,api});assert.equal(calls,3);assert.equal(json(f.original),before);
});
test("failed durable save prevents corrected uploads",async()=>{
  const f=fixture(),before=json(f.original);f.ledger.save=async()=>{throw new SocialError("github_request_failed");};
  await assert.rejects(executeRelease({...f,api:{request:()=>assert.fail("No API call")}}));assert.equal(json(f.original),before);
});
test("budget counts old withdrawn reservations plus correction without cap increase",async()=>{
  const f=fixture();f.original.platforms.x.xReservedUsd=4.5;
  f.ledger.data.releases[f.key]={manifestSha256,correction:f.grant,platforms:{instagram:{status:"published",verified:[]},facebook:{status:"published",verified:[]}}};
  const result=await executeRelease({...f,api:{request:()=>assert.fail("No API call")}});
  assert.equal(result[0].status,"blocked-budget");assert.equal(f.original.platforms.x.xReservedUsd,4.5);assert.equal(f.policy.xMonthlyCapUsd,5);
});
test("corrected reconciliation selects new record and cannot rewrite original",async()=>{
  const f=fixture(),before=json(f.original);
  f.ledger.data.releases[f.key]={manifestSha256,correction:f.grant,platforms:{x:{status:"published",verified:[{id:"corrected"}]}}};
  assert.deepEqual(await reconcileRelease({...f,api:{request:()=>assert.fail("No API call")}}),[{platform:"x",status:"already-published",posts:[{id:"corrected"}]}]);
  assert.equal(json(f.original),before);
  f.ledger.data.releases[f.key].correction={...f.grant,releaseAuthoritySha256:"e".repeat(64)};
  await assert.rejects(reconcileRelease({...f,api:{request:()=>assert.fail("No API call")}}));
});
test("new corrected withdrawal remains a stop",async()=>{
  const f=fixture();f.ledger.data.releases[f.key]={withdrawal:{status:"withdrawn-do-not-republish"}};
  for(const fn of [executeRelease,reconcileRelease])assert.deepEqual(await fn({...f}),[{platform:"all",status:"withdrawn-do-not-republish"}]);
});
test("only exact new approval, source and renewed authority accept the approved caption",()=>{
  const f=fixture();assert.equal(validateManifest(f.release,f.approved,f.catalog,f.policy),f.release);
  assert.deepEqual(Object.keys(selectedPolicy.exactApprovedCaptions),[internalId]);
  const c=selectedPolicy.exactApprovedCaptions[internalId];assert.equal(hash(c.text),c.textSha256);assert.equal(hash(c.text+"\n"),c.sourceCaption.sha256);
});
for(const field of ["approval3Sha256","sourceManifestSha256","releaseAuthoritySha256"])test(`caption rejects changed ${field} even with matching release index`,()=>{
  const f=fixture();delete f.policy.correctedReleases;f.release[field]=f.approved[field]="c".repeat(64);assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));
});
for(const [name,change]of [
  ["different text",f=>f.release.platforms.x.posts[0].text+=" changed"],
  ["terminal newline",f=>f.release.platforms.x.posts[0].text+="\n"],
  ["default-template substitution",f=>f.release.platforms.x.posts[0].text=`${f.release.title}\n${campaignUrl(slug,12,"x")}\n${DISCLOSURE}`],
  ["source-caption hash",f=>f.policy.exactApprovedCaptions[internalId].sourceCaption.sha256="e".repeat(64)],
])test(`exact corrected caption rejects ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));});
for(const suffix of [" @someone"," https://elsewhere.example/","x".repeat(281)])test(`rehashing caption cannot bypass mention/link/length guard (${suffix.length})`,()=>{
  const f=fixture(),c=f.policy.exactApprovedCaptions[internalId];c.text+=suffix;c.textSha256=hash(c.text);c.sourceCaption.sha256=hash(c.text+"\n");
  for(const p of Object.values(f.release.platforms))p.posts[0].text=c.text;
  assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));
});
test("other episodes retain default campaign/disclosure rules",()=>{
  const f=fixture();f.release.internalId=f.approved.internalId=f.catalog.episodes[0].internalId="ST-OTHER";delete f.policy.correctedReleases;
  assert.throws(()=>validateManifest(f.release,f.approved,f.catalog,f.policy));
  for(const [platform,p]of Object.entries(f.release.platforms))p.posts[0].text=`${f.release.title}\n${campaignUrl(slug,12,platform)}\n${DISCLOSURE}`;
  assert.equal(validateManifest(f.release,f.approved,f.catalog,f.policy),f.release);
});
test("only resolved correction versions Meta fetch URLs with exact bound media hash",()=>{
  const f=fixture(),{correction}=resolveReleaseKey(f);
  for(const platform of ["x","instagram","facebook"]) {
    const media=f.release.platforms[platform].posts[0].media[0],base=`https://sorrytomorrow.com/${media.path.slice(7)}`;
    assert.equal(providerMediaUrl(media,platform),base);
    assert.equal(providerMediaUrl(media,platform,correction),base+(platform==="x"?"":`?v=${media.sha256}`));
    assert.throws(()=>providerMediaUrl(media,platform,true));
  }
  const media=f.release.platforms.facebook.posts[0].media[0];
  assert.throws(()=>providerMediaUrl({...media,path:"public/social/other/facebook/p1.jpg"},"facebook",correction));
  assert.throws(()=>providerMediaUrl({...media,sha256:"arbitrary"},"facebook",correction));
  const unbound=resolveReleaseKey({...f,policy:{}});
  assert.equal(new URL(providerMediaUrl(media,"facebook",unbound.correction)).search,"");
});
for(const platform of ["instagram","facebook"])test(`${platform} upload preserves alt and order while using versioned correction URLs`,async()=>{
  const f=fixture(),{correction}=resolveReleaseKey(f),destination=f.release.platforms[platform];
  destination.posts[0].media.push({...destination.posts[0].media[0],path:`public/social/${slug}/${platform}/p2.jpg`,sha256:"b".repeat(64),alt:"Second corrected panel.",panelIds:["p2"]});
  for(const resolved of [null,correction]) {
    const calls=[];let id=100;
    const api={request:async(_p,method,url,body)=>{calls.push({method,url,body});return method==="GET"?{status_code:"FINISHED"}:{id:url.endsWith("/feed")?`${accounts.facebookPageId}_999`:String(id++)};}};
    await publishPlatform({platform,destination,api,step:async(_name,operation)=>operation(),correction:resolved});
    const uploaded=calls.filter(c=>c.body?.image_url||c.body?.url);
    assert.equal(uploaded.length,2);
    for(const [i,call]of uploaded.entries()) {
      const media=destination.posts[0].media[i];
      assert.equal(call.body.image_url??call.body.url,providerMediaUrl(media,platform,resolved));
      assert.equal(call.body.alt_text??call.body.alt_text_custom,media.alt);
    }
    if(platform==="facebook")assert.deepEqual(calls.at(-1).body.attached_media,[{media_fbid:"100"},{media_fbid:"101"}]);
    else assert.deepEqual(calls.find(c=>c.body?.media_type==="CAROUSEL").body.children,["100","101"]);
  }
});
test("preflight verifies exact effective Meta source URLs, and rejects stale bytes there",async()=>{
  const f=fixture(),{correction}=resolveReleaseKey(f),payload=Buffer.from("selected test bytes");
  for(const destination of Object.values(f.release.platforms))for(const media of destination.posts[0].media)Object.assign(media,{bytes:payload.length,sha256:hash(payload)});
  for(const resolved of [null,correction]) {
    const urls=[];
    const response=async url=>{urls.push(url);return new Response(url===f.release.canonicalUrl?`<article data-comic-slug="${slug}">`:payload);};
    assert.equal((await verifyLiveRelease(f.release,response,resolved)).imagesVerified,3);
    assert.deepEqual(urls.slice(1),Object.entries(f.release.platforms).map(([platform,d])=>providerMediaUrl(d.posts[0].media[0],platform,resolved)));
  }
  await assert.rejects(verifyLiveRelease(f.release,async url=>new Response(url===f.release.canonicalUrl?`<article data-comic-slug="${slug}">`:url.includes("?v=")?Buffer.from("stale wrong payload"):payload),correction),/Public platform file differs/);
});
