import { safeError } from "./adapters.mjs";
const count = n => Number.isSafeInteger(n) && n >= 0 ? n : null;

// Only previously verified own-account posts; no audience/person data or search.
export async function collectMetrics({ledger,api,selected="",now=new Date()}) {
  let scrubbed=false;
  for(const r of Object.values(ledger.data.releases))for(const s of Object.values(r.platforms??{}))if("metrics" in s){delete s.metrics;scrubbed=true;}
  const records=Object.values(ledger.data.releases).filter(r=>!selected||r.slug===selected).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,10);
  const results=[];
  for(const record of records)for(const [platform,state]of Object.entries(record.platforms)) {
    if(state.status!=="published")continue;
    const snapshot={observedAt:now.toISOString(),platform,posts:[]};
    for(const post of state.verified) {
      try {
        let metrics, publishedAt;
        const unavailableMetrics=[];
        if(platform==="x") {
          const data=await api.request("x","GET",`/2/tweets/${post.id}?tweet.fields=public_metrics,created_at`);
          publishedAt=data.data?.created_at;
          const m=data.data?.public_metrics??{};
          metrics=Object.fromEntries(["impression_count","like_count","reply_count","retweet_count","quote_count","bookmark_count"].map(k=>[k,count(m[k])]));
        } else if(platform==="instagram") {
          const m=await api.request("instagram","GET",`/v26.0/${post.id}?fields=id,timestamp,like_count,comments_count,saved_count,shares_count`);
          publishedAt=m.timestamp;
          metrics=Object.fromEntries(["like_count","comments_count","saved_count","shares_count"].map(k=>[k,count(m[k])]));
        } else {
          metrics={post_media_view:null,post_reactions_like_total:null};
          const basic=await api.request("facebook","GET",`/v26.0/${post.id}?fields=id,created_time`);
          publishedAt=basic.created_time;
          if(typeof publishedAt==="string"&&Number.isFinite(Date.parse(publishedAt)))post.publishedAt=new Date(publishedAt).toISOString();
          // Use the already granted aggregate read_insights scope. Direct
          // user-generated reaction/comment edges can require broader access.
          const insights=await api.request("facebook","GET",`/v26.0/${post.id}/insights?metric=post_media_view,post_reactions_like_total&period=lifetime`);
          for(const key of Object.keys(metrics))metrics[key]=count(insights.data?.find(m=>m.name===key)?.values?.[0]?.value);
        }
        if(typeof publishedAt==="string"&&Number.isFinite(Date.parse(publishedAt)))post.publishedAt=new Date(publishedAt).toISOString();
        const available=Object.values(metrics).filter(value=>value!==null).length;
        const status=available===0?"unavailable":unavailableMetrics.length||available<Object.keys(metrics).length?"partial":"observed";
        snapshot.posts.push({id:post.id,url:post.url,...(post.publishedAt?{publishedAt:post.publishedAt}:{}),status,metrics,...(unavailableMetrics.length?{unavailableMetrics}:{})});
      } catch(error) {snapshot.posts.push({id:post.id,url:post.url,status:"unavailable",error:safeError(error)});}
    }
    // The repository is public: retain operational status, not private insights.
    // Aggregate counts are returned transiently for the owner's PostHog project.
    state.metricsLastCheck={observedAt:snapshot.observedAt,posts:snapshot.posts.map(p=>({id:p.id,status:p.status,...(p.unavailableMetrics?{unavailableMetrics:p.unavailableMetrics}:{}),...(p.error?{error:p.error}:{})}))};
    delete state.metrics;
    await ledger.save();results.push({slug:record.slug,...snapshot});
  }
  if(scrubbed&&!results.length)await ledger.save();
  return results;
}
