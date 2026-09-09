import { safeError } from "./adapters.mjs";
const count = n => Number.isSafeInteger(n) && n >= 0 ? n : null;

// Only previously verified own-account posts; no audience/person data or search.
export async function collectMetrics({ledger,api,selected="",now=new Date()}) {
  const records=Object.values(ledger.data.releases).filter(r=>!selected||r.slug===selected).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,10);
  const results=[];
  for(const record of records)for(const [platform,state]of Object.entries(record.platforms)) {
    if(state.status!=="published")continue;
    const snapshot={observedAt:now.toISOString(),platform,posts:[]};
    for(const post of state.verified) {
      try {
        let metrics;
        if(platform==="x") {
          const data=await api.request("x","GET",`/2/tweets/${post.id}?tweet.fields=public_metrics`);
          const m=data.data?.public_metrics??{};
          metrics=Object.fromEntries(["impression_count","like_count","reply_count","retweet_count","quote_count","bookmark_count"].map(k=>[k,count(m[k])]));
        } else if(platform==="instagram") {
          const m=await api.request("instagram","GET",`/v26.0/${post.id}?fields=id,like_count,comments_count,saved_count,shares_count`);
          metrics=Object.fromEntries(["like_count","comments_count","saved_count","shares_count"].map(k=>[k,count(m[k])]));
        } else {
          const m=await api.request("facebook","GET",`/v26.0/${post.id}?fields=id,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)`);
          metrics={reactions:count(m.reactions?.summary?.total_count),comments:count(m.comments?.summary?.total_count),shares:count(m.shares?.count)};
        }
        snapshot.posts.push({id:post.id,url:post.url,status:"observed",metrics});
      } catch(error) {snapshot.posts.push({id:post.id,url:post.url,status:"unavailable",error:safeError(error)});}
    }
    state.metrics??=[];state.metrics.push(snapshot);
    // This is a small reporting history, not an audience database.
    if(state.metrics.length>16)state.metrics=state.metrics.slice(-16);
    await ledger.save();results.push({slug:record.slug,...snapshot});
  }
  return results;
}
