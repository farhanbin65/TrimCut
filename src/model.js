export const MIN_CLIP = 1/30;
export const length = c => c.out - c.in;
export const duration = clips => clips.reduce((n,c)=>n+length(c),0);
export function locate(clips,time){let start=0;for(const clip of clips){const end=start+length(clip);if(time<end)return {clip,start,source:clip.in+Math.max(0,time-start)};start=end;}if(clips.length){const clip=clips.at(-1);return {clip,start:start-length(clip),source:clip.out};}return null;}
export function trim(clip,edge,value){if(!Number.isFinite(value))return clip;return edge==='in'?{...clip,in:Math.max(0,Math.min(value,clip.out-MIN_CLIP))}:{...clip,out:Math.min(clip.duration,Math.max(value,clip.in+MIN_CLIP))};}
export function split(clips,time,id){const hit=locate(clips,time);if(!hit||hit.source-hit.clip.in<MIN_CLIP||hit.clip.out-hit.source<MIN_CLIP)return clips;return clips.flatMap(c=>c.id===hit.clip.id?[{...c,out:hit.source},{...c,id,in:hit.source}]:[c]);}
export function serialize(clips){return {version:1,width:1920,height:1080,fps:30,clips:clips.map(({id,assetId,name,duration,in:i,out})=>({id,assetId,name,duration,in:i,out,effects:[],keyframes:[]}))};}
export function validateProject(p){if(p?.version!==1||!Array.isArray(p.clips)||p.clips.length>1000)throw Error('Unsupported project');for(const c of p.clips)if(!['id','assetId','name'].every(k=>typeof c[k]==='string')||![c.in,c.out,c.duration].every(Number.isFinite)||c.in<0||c.out>c.duration||c.out-c.in<MIN_CLIP)throw Error('Invalid clip');return p;}
