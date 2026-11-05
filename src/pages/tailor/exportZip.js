import {bbox,fullOutline,saPoints,isLine} from './geometry.js';

/* Download every piece on the board as its own real-size SVG, packed in one ZIP (no extra library needed).
   Board units are centimetres, so each file is written with width/height in cm and opens at true size. */

const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const r=n=>+(+n).toFixed(3);
const slug=s=>(String(s||'piece').normalize('NFKD').replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-').slice(0,48)||'piece');
const poly=pts=>pts.map(([x,y])=>`${r(x)},${r(y)}`).join(' ');

/* The drawing of one piece, in board coordinates (so it can be used alone or on the whole-board sheet). */
function pieceMarkup(o,ops){
 const outline=fullOutline(o);
 const sa=(o.allowance??1)>0?saPoints({...o,points:outline,fold:false,allowance:o.allowance??1}):null;
 let g=`<g id="${esc(slug(o.name))}" data-piece="${esc(o.name)}" data-cut="${esc(o.cut??1)}">`;
 if(sa)g+=`<polygon id="seam-allowance" points="${poly(sa)}" fill="none" stroke="#e66239" stroke-width="0.05" stroke-dasharray="0.5 0.35"/>`;
 g+=`<polygon id="cut-line" points="${poly(outline)}" fill="none" stroke="#000" stroke-width="0.06" stroke-linejoin="round"/>`;
 for(const c of ops.filter(x=>x.parent===o.id)){
  if(isLine(c))g+=`<line data-kind="${esc(c.type)}" x1="${r(c.x1)}" y1="${r(c.y1)}" x2="${r(c.x2)}" y2="${r(c.y2)}" stroke="#000" stroke-width="0.04"${c.type==='grainline'||c.type==='stitch'?' stroke-dasharray="0.6 0.3"':''}/>`;
  else if(c.type==='notch'&&typeof c.x==='number')g+=`<circle data-kind="notch" cx="${r(c.x)}" cy="${r(c.y)}" r="0.25" fill="#000"/>`;
 }
 const b=bbox(outline);
 g+=`<text x="${r(b.x+b.w/2)}" y="${r(b.y+b.h/2)}" font-family="Helvetica,Arial,sans-serif" font-size="1.1" text-anchor="middle" fill="#000">${esc(o.name)}</text>`;
 g+=`<text x="${r(b.x+b.w/2)}" y="${r(b.y+b.h/2+1.5)}" font-family="Helvetica,Arial,sans-serif" font-size="0.8" text-anchor="middle" fill="#555">Cut ${esc(o.cut??1)}${o.fold?' on fold':''} · ${r(b.w)} × ${r(b.h)} cm</text>`;
 return {g:g+'</g>',box:sa?bbox([...outline,...sa]):b};
}

const svgDoc=(inner,box,pad=1.5)=>{
 const w=r(box.w+pad*2),h=r(box.h+pad*2);
 return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}cm" height="${h}cm" viewBox="${r(box.x-pad)} ${r(box.y-pad)} ${w} ${h}">\n<!-- 1 unit = 1 cm. Solid line = cut line, dashed orange = seam allowance. -->\n${inner}\n</svg>\n`;
};

export function pieceFiles(ops){
 const pieces=ops.filter(o=>o.type==='piece'&&o.points?.length>=3);
 const files=[],made=pieces.map(o=>({o,...pieceMarkup(o,ops)}));
 made.forEach((m,i)=>files.push({name:`${String(i+1).padStart(2,'0')}-${slug(m.o.name)}.svg`,text:svgDoc(m.g,m.box)}));
 if(made.length){
  const all=bbox(made.flatMap(m=>[[m.box.x,m.box.y],[m.box.x+m.box.w,m.box.y+m.box.h]]));
  files.unshift({name:'00-whole-board.svg',text:svgDoc(made.map(m=>m.g).join('\n'),all,3)});
 }
 files.push({name:'pieces.json',text:JSON.stringify({unit:'cm',pieces:made.map((m,i)=>({file:files.find(f=>f.name.startsWith(String(i+1).padStart(2,'0')+'-')).name,name:m.o.name,cut:m.o.cut??1,fold:!!m.o.fold,seamAllowanceCm:m.o.allowance??1,widthWithAllowanceCm:r(m.box.w),heightWithAllowanceCm:r(m.box.h)}))},null,2)});
 return files;
}

/* ---- minimal ZIP writer (stored, UTF-8 names) ---- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
export function makeZip(files,date=new Date()){
 const enc=new TextEncoder(),parts=[],central=[];let offset=0;
 const dt=((date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1))&0xFFFF,dd=(((date.getFullYear()-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate())&0xFFFF;
 for(const f of files){
  const name=enc.encode(f.name),data=f.data||enc.encode(f.text),crc=crc32(data);
  const lh=new DataView(new ArrayBuffer(30));
  lh.setUint32(0,0x04034b50,true);lh.setUint16(4,20,true);lh.setUint16(6,0x0800,true);lh.setUint16(8,0,true);lh.setUint16(10,dt,true);lh.setUint16(12,dd,true);
  lh.setUint32(14,crc,true);lh.setUint32(18,data.length,true);lh.setUint32(22,data.length,true);lh.setUint16(26,name.length,true);lh.setUint16(28,0,true);
  parts.push(new Uint8Array(lh.buffer),name,data);
  const ch=new DataView(new ArrayBuffer(46));
  ch.setUint32(0,0x02014b50,true);ch.setUint16(4,20,true);ch.setUint16(6,20,true);ch.setUint16(8,0x0800,true);ch.setUint16(10,0,true);ch.setUint16(12,dt,true);ch.setUint16(14,dd,true);
  ch.setUint32(16,crc,true);ch.setUint32(20,data.length,true);ch.setUint32(24,data.length,true);ch.setUint16(28,name.length,true);ch.setUint32(42,offset,true);
  central.push(new Uint8Array(ch.buffer),name);
  offset+=30+name.length+data.length;
 }
 const cdSize=central.reduce((n,p)=>n+p.length,0),end=new DataView(new ArrayBuffer(22));
 end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cdSize,true);end.setUint32(16,offset,true);
 return new Blob([...parts,...central,new Uint8Array(end.buffer)],{type:'application/zip'});
}

export function buildPiecesZip(ops){
 const files=pieceFiles(ops);
 if(!files.some(f=>f.name!=='pieces.json'))return null;
 return {blob:makeZip(files),count:files.length-2};
}
export function saveBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
