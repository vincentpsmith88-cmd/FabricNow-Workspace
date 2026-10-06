/* Built-in fabric prints. Each print is drawn inside a tile of w x h cm; `m(c)` returns the SVG markup for colours c. */
const R=(x,y,w,h,f,x2='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${x2}/>`;
const C=(x,y,r,f,x2='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${x2}/>`;
export const PRINTS=[
 {id:'solid',name:'Plain colour',tile:[10,10],colors:['#C44A1D'],m:c=>R(0,0,10,10,c[0])},
 {id:'ankara',name:'Ankara circles',tile:[16,16],colors:['#1F4E8C','#F2B134','#E24A33'],m:c=>R(0,0,16,16,c[0])+C(8,8,6.4,c[1])+C(8,8,4.2,c[0])+C(8,8,2.4,c[2])+C(0,0,3,c[2])+C(16,0,3,c[2])+C(0,16,3,c[2])+C(16,16,3,c[2])},
 {id:'kente',name:'Kente weave',tile:[24,24],colors:['#F2B134','#1B7F4B','#B3261E'],m:c=>R(0,0,24,24,c[0])+R(0,0,24,5,c[1])+R(0,10,24,4,c[2])+R(0,19,24,5,c[1])+R(3,0,4,24,c[2],'fill-opacity=".85"')+R(15,0,4,24,c[1],'fill-opacity=".85"')+R(3,10,4,4,c[0])+R(15,10,4,4,c[0])+R(3,0,4,5,c[0])+R(15,19,4,5,c[0])},
 {id:'adire',name:'Adire indigo',tile:[22,22],colors:['#1D2F6F','#E9EEF8'],m:c=>R(0,0,22,22,c[0])+[[6,6],[17,15]].map(([x,y])=>[5,3.4,1.8].map((r,i)=>C(x,y,r,'none',`stroke="${c[1]}" stroke-width="${i?.9:1.3}"`)).join('')+C(x,y,.7,c[1])).join('')+C(17,3,1.2,c[1],'fill-opacity=".7"')+C(3,17,1.2,c[1],'fill-opacity=".7"')},
 {id:'kitenge',name:'Kitenge floral',tile:[20,20],colors:['#F6E7C9','#D6336C','#2E7D32'],m:c=>R(0,0,20,20,c[0])+[0,72,144,216,288].map(a=>`<ellipse cx="10" cy="5.6" rx="2.4" ry="4" fill="${c[1]}" transform="rotate(${a} 10 10)"/>`).join('')+C(10,10,2,c[0])+C(10,10,1,c[1])+`<ellipse cx="2" cy="2" rx="1.2" ry="3" fill="${c[2]}" transform="rotate(45 2 2)"/><ellipse cx="18" cy="18" rx="1.2" ry="3" fill="${c[2]}" transform="rotate(45 18 18)"/>`},
 {id:'bogolan',name:'Bogolan mudcloth',tile:[20,20],colors:['#E8DCC2','#2B2118'],m:c=>R(0,0,20,20,c[0])+`<polyline points="0,5 3,2 6,5 9,2 12,5 15,2 18,5 20,3" fill="none" stroke="${c[1]}" stroke-width="1.1"/><polyline points="0,15 3,12 6,15 9,12 12,15 15,12 18,15 20,13" fill="none" stroke="${c[1]}" stroke-width="1.1"/>`+R(0,9,20,.8,c[1])+[2,6,10,14,18].map(x=>C(x,10.2+0,.6,c[1])).join('')+R(0,19.2,20,.8,c[1])},
 {id:'shweshwe',name:'Shweshwe',tile:[8,8],colors:['#2A3F8F','#C9D3F0'],m:c=>R(0,0,8,8,c[0])+`<path d="M4 .6L7.4 4L4 7.4L.6 4Z" fill="none" stroke="${c[1]}" stroke-width=".5"/>`+C(4,4,.6,c[1])+C(0,0,.5,c[1])+C(8,0,.5,c[1])+C(0,8,.5,c[1])+C(8,8,.5,c[1])},
 {id:'wax',name:'Wax print swirl',tile:[18,18],colors:['#0E7C86','#F4C430','#C0392B'],m:c=>R(0,0,18,18,c[0])+[7,5.2,3.4,1.6].map((r,i)=>C(9,9,r,'none',`stroke="${[c[1],c[2],c[1],c[2]][i]}" stroke-width="1.3"`)).join('')+C(0,0,4,c[1],'fill-opacity=".8"')+C(18,18,4,c[1],'fill-opacity=".8"')},
 {id:'stripes',name:'Stripes',tile:[10,10],colors:['#FFFFFF','#2C3E75'],m:c=>R(0,0,10,10,c[0])+R(0,0,5,10,c[1])},
 {id:'gingham',name:'Gingham',tile:[10,10],colors:['#FFFFFF','#D94F4F'],m:c=>R(0,0,10,10,c[0])+R(0,0,5,10,c[1],'fill-opacity=".45"')+R(0,0,10,5,c[1],'fill-opacity=".45"')},
 {id:'dots',name:'Polka dots',tile:[10,10],colors:['#F7F0E0','#B3261E'],m:c=>R(0,0,10,10,c[0])+C(5,5,2,c[1])}
];
export const printById=id=>PRINTS.find(p=>p.id===id)||PRINTS[0];
/* A fabric setting: {id, colors, scale (%), rot (deg)} or {src, tile, scale, rot} for an uploaded swatch photo. */
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export function tileOf(f){
 if(f?.src)return {w:f.tile?.[0]||20,h:f.tile?.[1]||20,markup:`<image href="${esc(f.src)}" x="0" y="0" width="${f.tile?.[0]||20}" height="${f.tile?.[1]||20}" preserveAspectRatio="none"/>`};
 const p=printById(f?.id),cols=(f?.colors?.length?f.colors:p.colors);
 return {w:p.tile[0],h:p.tile[1],markup:p.m([...cols,...p.colors.slice(cols.length)])};
}
export const fabricKey=f=>f?`${f.id||'img'}|${(f.colors||[]).join()}|${f.scale||100}|${f.rot||0}|${f.src?f.src.length:0}`:'';
/* Standalone SVG of one tile (used to make a 3D texture). */
export function tileSvg(f,px=16){const t=tileOf(f);return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.w*px}" height="${t.h*px}" viewBox="0 0 ${t.w} ${t.h}">${t.markup}</svg>`}
