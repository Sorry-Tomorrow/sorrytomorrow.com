import { publicProjectToken } from "../../app/analytics-policy.mjs";

const allowedMetrics=new Set(["impression_count","like_count","reply_count","retweet_count","quote_count","bookmark_count","comments_count","saved_count","shares_count","reactions","comments","shares","post_media_view","post_reactions_like_total"]);

// Service-side aggregate snapshots, never visitor events or person profiles.
// Latest-per-post reporting avoids summing cumulative engagement snapshots.
export function metricEvents(snapshots) {
  const batch=[];
  for(const snapshot of snapshots)for(const post of snapshot.posts??[]) {
    if(typeof snapshot.observedAt!=="string"||!/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(snapshot.observedAt)||!Number.isFinite(Date.parse(snapshot.observedAt)))continue;
    if(!["observed","partial","unavailable"].includes(post.status)||!["x","instagram","facebook"].includes(snapshot.platform))continue;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(snapshot.slug)||!/^[0-9]+(?:_[0-9]+)?$/.test(post.id))continue;
    const metrics=Object.fromEntries(Object.entries(post.metrics??{}).filter(([key,value])=>allowedMetrics.has(key)&&(value===null||Number.isSafeInteger(value)&&value>=0)));
    batch.push({event:"social_post_metrics",timestamp:snapshot.observedAt,properties:{
      distinct_id:`social-post:${snapshot.platform}:${post.id}`,
      $process_person_profile:false,
      $geoip_disable:true,
      measurement_source:"verified-own-platform-api",
      metrics_status:post.status,
      comic_slug:snapshot.slug,platform:snapshot.platform,post_id:post.id,
      ...metrics,
    }});
  }
  return batch;
}

export function reportingStatus(snapshots,delivery) {
  if(snapshots.some(s=>s.posts.some(p=>p.status==="unavailable")))return "attention-required";
  if(snapshots.length&&!['accepted-persistence-not-yet-verified','nothing-to-report'].includes(delivery.status))return "attention-required";
  return "passed";
}

export async function reportMetricsToPostHog({snapshots,token,fetchImpl=fetch}) {
  const key=publicProjectToken(token);
  if(!key)return{status:"unconfigured",events:0};
  const batch=metricEvents(snapshots);
  if(!batch.length)return{status:"nothing-to-report",events:0};
  try {
    const r=await fetchImpl("https://us.i.posthog.com/batch/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:key,batch}),redirect:"error",signal:AbortSignal.timeout(15_000)});
    return{status:r.ok?"accepted-persistence-not-yet-verified":"unavailable",events:batch.length,httpStatus:r.status};
  }catch{return{status:"delivery-unknown-no-retry",events:batch.length};}
}
