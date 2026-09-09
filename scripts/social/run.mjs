import assert from "node:assert/strict";
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { accounts } from "../social-connections.mjs";
import { hash, json, loadReleases, ORIGIN, slugValid, safeRead } from "./policy.mjs";
import { makeApi, safeError, SocialError } from "./adapters.mjs";
import { githubApi, loadLedger, executeRelease, reconcileRelease } from "./ledger.mjs";
import { collectMetrics } from "./metrics.mjs";

export function trustedContext(env,event) {
  if(env.GITHUB_ACTIONS!=="true"||env.GITHUB_REPOSITORY!==accounts.repository||env.GITHUB_REF!=="refs/heads/main")return false;
  if(env.GITHUB_EVENT_NAME==="workflow_dispatch"||env.GITHUB_EVENT_NAME==="schedule")return event.repository?.full_name===accounts.repository;
  const run=event.workflow_run;
  return env.GITHUB_EVENT_NAME==="workflow_run"&&event.action==="completed"&&event.repository?.full_name===accounts.repository
    &&run?.head_repository?.full_name===accounts.repository&&run.head_branch==="main"&&["push","workflow_dispatch"].includes(run.event)
    &&run.conclusion==="success"&&run.path===".github/workflows/pages.yml";
}

export async function verifiedDeployment(gh,commit,event) {
  const prefix=`/repos/${accounts.repository}`;
  const tip=await gh("GET",`${prefix}/git/ref/heads/main`);
  if(tip.object.sha!==commit)return null;
  let run;
  if(event.workflow_run)run=await gh("GET",`${prefix}/actions/runs/${event.workflow_run.id}`);
  else {
    const result=await gh("GET",`${prefix}/actions/workflows/pages.yml/runs?branch=main&status=success&per_page=10`);
    run=result.workflow_runs.find(r=>r.head_sha===commit);
  }
  if(!run||run.head_sha!==commit)return null;
  assert.equal(run.head_repository?.full_name,accounts.repository);assert.equal(run.head_branch,"main");
  assert.equal(run.conclusion,"success");assert.ok(["push","workflow_dispatch"].includes(run.event));
  const jobs=await gh("GET",`${prefix}/actions/runs/${run.id}/jobs?per_page=100`);
  assert.ok(jobs.jobs.some(j=>j.name==="deploy"&&j.conclusion==="success"),"No successful actual Pages deploy job");
  return {commit,runId:run.id,url:run.html_url};
}

async function fetchBounded(url,limit,fetchImpl=fetch) {
  const target=new URL(url);assert.equal(target.origin,ORIGIN);
  const r=await fetchImpl(target.href,{redirect:"error",signal:AbortSignal.timeout(30_000),cache:"no-store"});
  if(!r.ok)throw new SocialError("live_asset_unavailable",r.status);
  const reader=r.body.getReader();const chunks=[];let count=0;
  for(;;){const{done,value}=await reader.read();if(done)break;count+=value.length;if(count>limit){await reader.cancel();throw new SocialError("live_response_too_large");}chunks.push(Buffer.from(value));}
  return Buffer.concat(chunks);
}

export async function verifyLiveRelease(release,fetchImpl=fetch) {
  const html=(await fetchBounded(release.canonicalUrl,2_000_000,fetchImpl)).toString("utf8");
  assert.ok(html.includes(`data-comic-slug="${release.slug}"`),"Actual public comic not deployed");
  const unique=new Map();
  for(const destination of Object.values(release.platforms))for(const post of destination.posts)for(const media of post.media)unique.set(media.path,media);
  for(const media of unique.values()) {
    const bytes=await fetchBounded(new URL(media.path.replace(/^public\//,"/"),ORIGIN),media.bytes,fetchImpl);
    assert.equal(bytes.length,media.bytes);assert.equal(hash(bytes),media.sha256,"Public platform file differs from approved upload");
  }
  return {url:release.canonicalUrl,imagesVerified:unique.size};
}

export async function run({root=process.cwd(),env=process.env,mode="validate",selected="",fetchImpl=fetch}={}) {
  assert.ok(["validate","dry-run","initialize","publish","reconcile","health","metrics"].includes(mode));
  assert.ok(!selected||slugValid(selected));
  // Credential renewal must not depend on the latest website build or assets.
  if(mode==="health"||mode==="metrics") {
    const event=JSON.parse(await readFile(env.GITHUB_EVENT_PATH,"utf8"));assert.ok(trustedContext(env,event));
    const policy=JSON.parse(await safeRead(root,"social/policy.json"));
    const api=makeApi({env,fetchImpl}),accountChecks=await api.identities();
    const days=Math.floor((Date.parse(policy.metaDataAccessExpiresAt)-Date.now())/86400000);
    const report={mode,accountChecks,metaDataAccessDaysRemaining:days,results:[]};
    if(accountChecks.status!=="passed")return {...report,status:"attention-required"};
    if(!Number.isFinite(days)||days<=14)return {...report,status:"renew-meta-data-access"};
    const ledger=await loadLedger(githubApi(env,fetchImpl));
    report.metrics=await collectMetrics({ledger,api,selected});
    return {...report,status:"passed"};
  }
  const loaded=await loadReleases(root);
  const entries=selected?loaded.releases.filter(e=>e.release.slug===selected):loaded.releases;
  assert.ok(!selected||entries.length===1,"Selected approved comic missing");
  const report={mode,publishingEnabled:env.SOCIAL_PUBLISHING_ENABLED==="true",releaseCount:entries.length,results:[]};
  if(mode==="validate")return report;
  const event=JSON.parse(await readFile(env.GITHUB_EVENT_PATH,"utf8"));
  assert.ok(trustedContext(env,event),"Untrusted workflow context");
  const gh=githubApi(env,fetchImpl);
  const deployment=await verifiedDeployment(gh,env.CHECKED_OUT_SHA,event);
  if(!deployment)return {...report,status:"skipped-not-current-deployed-main"};
  report.deployment=deployment;
  if(mode==="publish"&&env.SOCIAL_PUBLISHING_ENABLED!=="true")return {...report,status:"disabled"};
  if(mode==="initialize") {
    const ledger=await loadLedger(gh,{...loaded,initialize:true,commit:deployment.commit});
    return {...report,status:"initialized",baselineExcludedCount:ledger.data.baselineExcludedIds.length};
  }
  const api=makeApi({env,fetchImpl});
  report.accountChecks=await api.identities();
  assert.equal(report.accountChecks.status,"passed","An account identity check failed");
  const expires=Date.parse(loaded.policy.metaDataAccessExpiresAt);
  assert.ok(Number.isFinite(expires));
  report.metaDataAccessDaysRemaining=Math.floor((expires-Date.now())/86400000);
  if(report.metaDataAccessDaysRemaining<=0)throw new SocialError("meta_data_access_renewal_required");
  const ledger=await loadLedger(gh);
  for(const entry of entries) {
    report.results.push({slug:entry.release.slug,live:await verifyLiveRelease(entry.release,fetchImpl),...(mode==="dry-run"?{status:"ready-no-writes"}:{platforms:mode==="reconcile"
      ?await reconcileRelease({entry,ledger,api})
      :await executeRelease({entry,ledger,api,root,commit:deployment.commit,runId:env.GITHUB_RUN_ID,policy:loaded.policy})})});
  }
  report.status=report.results.every(r=>!r.platforms||r.platforms.every(p=>["published","already-published"].includes(p.status)))?"passed":"attention-required";
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let report;
  try{report=await run({mode:process.argv[2]??"validate",selected:process.argv[3]??""});}
  catch(error){report={status:"failed",error:safeError(error)};}
  console.log(json(report));
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`## Sorry, Tomorrow social release\n\n\`\`\`json\n${json(report)}\`\`\`\n\nNo blind retries. Existing successful posts are never repeated.\n`);
  if(["failed","attention-required","renew-meta-data-access"].includes(report.status))process.exitCode=1;
}
