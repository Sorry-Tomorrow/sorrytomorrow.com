import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { accounts, checkConnections } from "../social-connections.mjs";
import { ORIGIN, numericId, safeRead } from "./policy.mjs";

export class SocialError extends Error {
  constructor(code, status, providerCode) { super(code); this.code = code; this.status = status; this.providerCode = providerCode; }
}
export const safeError = error => error instanceof SocialError
  ? { code: error.code, ...(Number.isInteger(error.status) ? { httpStatus: error.status } : {}), ...(Number.isInteger(error.providerCode) ? { providerCode: error.providerCode } : {}) }
  : { code: "validation_or_state_failure" };
const enc = value => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

export function xAuthorization(method, url, env, { nonce = randomBytes(16).toString("hex"), timestamp = String(Math.floor(Date.now()/1000)) } = {}) {
  const target = new URL(url);
  assert.ok(target.origin === "https://api.x.com" && !target.username && !target.password && ["GET","POST"].includes(method));
  for (const key of ["X_API_KEY","X_API_SECRET","X_ACCESS_TOKEN","X_ACCESS_TOKEN_SECRET"]) assert.ok(typeof env[key] === "string" && env[key].trim());
  const oauth = { oauth_consumer_key: env.X_API_KEY, oauth_nonce: nonce, oauth_signature_method: "HMAC-SHA1", oauth_timestamp: timestamp, oauth_token: env.X_ACCESS_TOKEN, oauth_version: "1.0" };
  const parameters = [...target.searchParams, ...Object.entries(oauth)].map(([k,v])=>[enc(k),enc(v)]).sort(([ak,av],[bk,bv])=>ak<bk?-1:ak>bk?1:av<bv?-1:av>bv?1:0).map(pair=>pair.join("=")).join("&");
  oauth.oauth_signature = createHmac("sha1",`${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_TOKEN_SECRET)}`).update([method, target.origin+target.pathname, parameters].map(enc).join("&")).digest("base64");
  return `OAuth ${Object.entries(oauth).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${enc(k)}="${enc(v)}"`).join(", ")}`;
}

export function makeApi({ env, fetchImpl = fetch }) {
  async function request(platform, method, endpoint, body) {
    assert.ok(["GET","POST"].includes(method));
    const origin = platform === "x" ? "https://api.x.com" : "https://graph.facebook.com";
    const url = new URL(endpoint, origin);
    assert.equal(url.origin, origin);
    assert.ok(!url.username && !url.password && !url.hash && !url.searchParams.has("access_token"));
    assert.ok(["x","facebook","instagram"].includes(platform));
    const allowedPost=platform==="x"?["/2/media/upload","/2/media/metadata","/2/tweets"]
      :[`/v26.0/${accounts.facebookPageId}/photos`,`/v26.0/${accounts.facebookPageId}/feed`,`/v26.0/${accounts.instagramId}/media`,`/v26.0/${accounts.instagramId}/media_publish`];
    if(method==="POST")assert.ok(allowedPost.includes(url.pathname),"Unrequested mutation endpoint");
    else assert.ok(platform==="x"?/^\/2\/(users\/me|tweets\/[0-9]+)$/.test(url.pathname)
      :/^\/v26\.0\/[0-9]+(?:_[0-9]+)?$/.test(url.pathname)||url.pathname===`/v26.0/${accounts.instagramId}/content_publishing_limit`,"Unrequested read endpoint");
    const authorization = platform === "x" ? xAuthorization(method, url.href, env) : `Bearer ${env.META_PAGE_ACCESS_TOKEN}`;
    assert.ok(platform === "x" || env.META_PAGE_ACCESS_TOKEN);
    let response;
    try { response = await fetchImpl(url.href, { method, headers: { Authorization: authorization, Accept: "application/json", ...(body ? {"Content-Type":"application/json"} : {}) },
      ...(body ? {body:JSON.stringify(body)} : {}), redirect:"error", signal:AbortSignal.timeout(90_000) }); }
    catch { throw new SocialError("network_or_redirect_outcome_unknown"); }
    let data;
    try { data = await response.json(); } catch { throw new SocialError("invalid_json_outcome_unknown", response.status); }
    if (!response.ok || data.error || data.errors?.length) throw new SocialError("provider_rejected_request", response.status, data.error?.code);
    return data;
  }
  return { request, identities: () => checkConnections({env,fetchImpl}) };
}

const idFrom = data => { assert.ok(numericId(data?.id), "Missing provider identifier"); return data.id; };
const postIdFrom = data => { assert.ok(typeof data?.id === "string" && /^[0-9]+_[0-9]+$/.test(data.id), "Invalid Facebook post identifier"); return data.id; };
const mediaUrl = media => new URL(media.path.replace(/^public\//,"/"), ORIGIN).href;
const sleepDefault = ms => new Promise(resolve=>setTimeout(resolve,ms));

export async function publishPlatform({ platform, destination, root, api, step, sleep = sleepDefault }) {
  const results = [];
  for (const [p, post] of destination.posts.entries()) {
    if (platform === "x") {
      const images = [];
      for (const [i, media] of post.media.entries()) {
        const uploaded = await step(`post-${p}-image-${i}`, async () => {
          const data = await api.request("x","POST","/2/media/upload",{media_category:"tweet_image",media:(await safeRead(root,media.path)).toString("base64")});
          const id = idFrom(data.data);
          assert.ok(typeof data.data.media_key === "string" && /^[0-9]+_[0-9]+$/.test(data.data.media_key));
          if (data.data.processing_info && data.data.processing_info.state !== "succeeded") throw new SocialError("image_processing_not_complete");
          return { id, mediaKey:data.data.media_key, sha256:media.sha256 };
        });
        await step(`post-${p}-alt-${i}`, async () => {
          const data = await api.request("x","POST","/2/media/metadata",{id:uploaded.id,metadata:{alt_text:{text:media.alt}}});
          assert.equal(data.data?.id,uploaded.id); return {id:uploaded.id};
        });
        images.push(uploaded);
      }
      const created = await step(`post-${p}-publish`, async () => {
        const data = await api.request("x","POST","/2/tweets",{text:post.text,media:{media_ids:images.map(i=>i.id)},...(p ? {reply:{in_reply_to_tweet_id:results[p-1].id}} : {})});
        const id = idFrom(data.data); return {id,url:`https://x.com/${accounts.xHandle}/status/${id}`};
      });
      results.push({...created,images});
    } else if (platform === "facebook") {
      const images = [];
      for (const [i,media] of post.media.entries()) {
        images.push(await step(`post-${p}-image-${i}`,async()=>{
          const data=await api.request("facebook","POST",`/v26.0/${accounts.facebookPageId}/photos`,{url:mediaUrl(media),published:false,alt_text_custom:media.alt});
          return {id:idFrom(data),sha256:media.sha256};
        }));
      }
      const created=await step(`post-${p}-publish`,async()=>{
        const data=await api.request("facebook","POST",`/v26.0/${accounts.facebookPageId}/feed`,{message:post.text,attached_media:images.map(i=>({media_fbid:i.id}))});
        const id=postIdFrom(data);return {id};
      });
      results.push({...created,images});
    } else {
      assert.equal(platform,"instagram");
      const containers=[];
      for (const [i,media] of post.media.entries()) {
        containers.push(await step(`post-${p}-image-${i}`,async()=>{
          const data=await api.request("instagram","POST",`/v26.0/${accounts.instagramId}/media`,{image_url:mediaUrl(media),is_carousel_item:post.media.length>1,alt_text:media.alt,...(post.media.length===1?{caption:post.text,is_ai_generated:true}:{})});
          return {id:idFrom(data),sha256:media.sha256};
        }));
      }
      const parent=post.media.length>1 ? await step(`post-${p}-carousel`,async()=>{
        const data=await api.request("instagram","POST",`/v26.0/${accounts.instagramId}/media`,{media_type:"CAROUSEL",children:containers.map(i=>i.id),caption:post.text,is_ai_generated:true});return {id:idFrom(data)};
      }) : containers[0];
      let ready=false;
      for(let n=0;n<5;n++) {
        const status=await api.request("instagram","GET",`/v26.0/${parent.id}?fields=status_code`);
        if(status.status_code==="FINISHED"){ready=true;break;}
        if(status.status_code!=="IN_PROGRESS")throw new SocialError("instagram_container_not_publishable");
        if(n<4)await sleep(60_000);
      }
      if(!ready)throw new SocialError("instagram_processing_timeout");
      const created=await step(`post-${p}-publish`,async()=>{
        const data=await api.request("instagram","POST",`/v26.0/${accounts.instagramId}/media_publish`,{creation_id:parent.id});return {id:idFrom(data),containerId:parent.id};
      });
      results.push({...created,images:containers});
    }
  }
  return results;
}

function expandedXText(data) {
  let text=data.text;
  for(const entity of data.entities?.urls??[]) if(entity.expanded_url)text=text.replace(entity.url,entity.expanded_url);
  // X may append the attachment URL to the API text; it is not a caption edit.
  for(const entity of data.entities?.urls??[]) if(entity.media_key)text=text.replace(entity.expanded_url??entity.url,"").trimEnd();
  return text;
}

export async function verifyPlatform({platform,destination,results,api}) {
  const verified=[];
  assert.equal(results.length,destination.posts.length);
  for(const [p,result] of results.entries()) {
    assert.ok(platform==="facebook"?new RegExp(`^${accounts.facebookPageId}_[0-9]+$`).test(result.id):numericId(result.id),"Invalid saved post ID");
    const expected=destination.posts[p];
    if(platform==="x") {
      const data=await api.request("x","GET",`/2/tweets/${result.id}?tweet.fields=author_id,attachments,entities&expansions=attachments.media_keys&media.fields=media_key,type,width,height,alt_text`);
      assert.equal(data.data?.author_id,accounts.xUserId);
      assert.equal(expandedXText(data.data),expected.text);
      assert.deepEqual(data.data.attachments?.media_keys,result.images.map(i=>i.mediaKey));
      for(const [i,image]of result.images.entries()) {
        const actual=data.includes?.media?.find(m=>m.media_key===image.mediaKey);
        assert.equal(actual?.type,"photo");assert.equal(actual.alt_text,expected.media[i].alt);
        assert.ok(actual.width>0&&actual.height>0&&Math.abs(actual.width/actual.height-expected.media[i].width/expected.media[i].height)<0.015,"X image aspect ratio changed");
      }
      verified.push({id:result.id,url:result.url,attachmentIds:result.images.map(i=>i.id),copyAndAltVerified:true});
    } else if(platform==="facebook") {
      const data=await api.request("facebook","GET",`/v26.0/${result.id}?fields=id,from,message,permalink_url,attachments{subattachments{target},target}`);
      assert.equal(data.from?.id,accounts.facebookPageId);assert.equal(data.message,expected.text);
      const attachments=data.attachments?.data??[];
      const ids=attachments.flatMap(a=>a.subattachments?.data?.map(s=>s.target?.id)??[a.target?.id]);
      assert.deepEqual(ids,result.images.map(i=>i.id));
      for(const [i,image]of result.images.entries()) {
        const actual=await api.request("facebook","GET",`/v26.0/${image.id}?fields=id,alt_text_custom,width,height`);
        assert.equal(actual.alt_text_custom,expected.media[i].alt);
        assert.ok(actual.width>0&&actual.height>0&&Math.abs(actual.width/actual.height-expected.media[i].width/expected.media[i].height)<0.015,"Facebook image aspect ratio changed");
      }
      assert.ok(["www.facebook.com","facebook.com"].includes(new URL(data.permalink_url).hostname));
      verified.push({id:result.id,url:data.permalink_url,attachmentIds:ids,copyAndAltVerified:true});
    } else {
      const data=await api.request("instagram","GET",`/v26.0/${result.id}?fields=id,owner,username,caption,media_type,permalink,is_ai_generated,children{id,media_type,alt_text}`);
      assert.equal(data.owner?.id,accounts.instagramId);
      if(data.username)assert.equal(data.username,accounts.instagramHandle);
      assert.equal(data.is_ai_generated,true);assert.equal(data.caption,expected.text);
      assert.equal(data.media_type,expected.media.length>1?"CAROUSEL_ALBUM":"IMAGE");
      const children=expected.media.length>1?data.children?.data:[await api.request("instagram","GET",`/v26.0/${result.id}?fields=id,media_type,alt_text`)];
      assert.equal(children?.length,expected.media.length);
      children.forEach((child,i)=>{assert.equal(child.media_type,"IMAGE");assert.equal(child.alt_text,expected.media[i].alt);});
      assert.ok(["www.instagram.com","instagram.com"].includes(new URL(data.permalink).hostname));
      verified.push({id:result.id,url:data.permalink,attachmentIds:children.map(c=>c.id),copyAndAltVerified:true,containerId:result.containerId});
    }
  }
  return verified;
}
