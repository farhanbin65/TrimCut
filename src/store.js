import {create} from 'zustand';
import {duration,trim,split} from './model.js';
export const useEditor=create((set,get)=>({clips:[],time:0,playing:false,selected:null,error:'',
add:clip=>set(s=>({clips:[...s.clips,clip],selected:clip.id})),
seek:time=>set(s=>({time:Math.max(0,Math.min(time,duration(s.clips)))})),
play:playing=>set({playing}),select:selected=>set({selected}),
trim:(id,edge,value)=>set(s=>({playing:false,clips:s.clips.map(c=>c.id===id?trim(c,edge,value):c),time:0})),
split:()=>set(s=>({playing:false,clips:split(s.clips,s.time,crypto.randomUUID())})),
move:(from,to)=>set(s=>{const clips=[...s.clips];const [c]=clips.splice(from,1);clips.splice(to,0,c);return {clips,time:0,playing:false};}),
error:error=>set({error}),
}));
export async function importVideo(file){const url=URL.createObjectURL(file);try{const video=document.createElement('video');video.preload='metadata';video.src=url;await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=()=>reject(Error('This video codec cannot be previewed. Try an H.264 MP4.'));});if(!Number.isFinite(video.duration)||video.duration<=0)throw Error('Invalid video duration');const id=crypto.randomUUID();useEditor.getState().add({id,assetId:id,name:file.name,file,url,duration:video.duration,in:0,out:video.duration});}catch(e){URL.revokeObjectURL(url);throw e;}}
