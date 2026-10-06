/* Turns a Pattern Library design into a starting point for Tailor Tools. */
import {buildBlock,placeGroups,DEFAULT_STYLE,SIZES,DEFAULT_MEAS} from '../tailor/blocks.js';

const NECK={round:'round',scoop:'scoop',v:'v-neck',square:'square',sweetheart:'sweetheart',boat:'boat'};
const FIT={fitted:'fitted',regular:'relaxed',boxy:'relaxed',oversized:'loose'};
const BODICE_LEN={crop:'waist',waist:'waist',hip:'hip',tunic:'tunic',long:'tunic'};
const SLEEVE_LEN={short:'short',elbow:'elbow','three-quarter':'three-quarter',long:'full'};
const SKIRT={straight:'straight',pencil:'pencil','a-line':'a-line',flared:'flared',gathered:'gathered',mermaid:'mermaid',circle:'circle',wrap:'a-line',tiered:'gathered'};

/* What we could and could not carry across, so the designer is told. */
export function seedFromDesign(design,size='M'){
 const sp=design.spec||{},notes=[],style={...DEFAULT_STYLE};
 style.neckline=NECK[sp.neckline]||'round';
 if(['collar','stand'].includes(sp.neckline))notes.push('A collar piece was added. Sew it onto the round neckline.');
 else if(!NECK[sp.neckline])notes.push(`The ${sp.neckline} neckline is not a block shape yet, so a round neckline was used.`);
 style.fit=FIT[sp.fit]||'relaxed';
 const family=sp.family;
 if(family==='top'||family==='jumpsuit')style.bodiceLen=BODICE_LEN[sp.length]||'hip';
 if(sp.sleeve==='cap')style.sleeve='cap';
 else{style.sleeve=['puff','bell','bishop'].includes(sp.sleeveStyle)?sp.sleeveStyle:'set-in';style.sleeveLen=SLEEVE_LEN[sp.sleeve]||'full'}
 if(['raglan','drop'].includes(sp.sleeveStyle))notes.push(`${sp.sleeveStyle==='raglan'?'Raglan':'Drop-shoulder'} sleeves are drafted as set-in sleeves for now.`);
 style.skirt=SKIRT[sp.skirt]||'a-line';
 if(sp.skirt==='wrap'||sp.skirt==='tiered')notes.push(`The ${sp.skirt} skirt is drafted as ${sp.skirt==='wrap'?'an A-line':'a gathered'} skirt for now.`);
 style.skirtLen=['mini','knee','midi','maxi'].includes(sp.length)?sp.length:'knee';
 style.leg=sp.leg||'straight';style.legLen={shorts:'shorts',cropped:'cropped',ankle:'ankle',full:'full'}[sp.length]||'full';
 const sleeveless=sp.sleeve==='none';
 let blocks;
 if(family==='dress')blocks=['bodice-front','bodice-back','skirt-front','skirt-back',...(sleeveless?[]:['sleeve'])];
 else if(family==='skirt')blocks=['skirt-front','skirt-back','waistband'];
 else if(family==='trousers')blocks=['trouser-front','trouser-back','waistband',...(sp.pockets&&sp.pockets!=='none'?['pocket']:[])];
 else if(family==='jumpsuit'){blocks=['bodice-front','bodice-back',...(sleeveless?[]:['sleeve']),'trouser-front','trouser-back'];notes.push('A jumpsuit is drafted as a bodice and trousers. Join them at the waist when you sew.')}
 else blocks=['bodice-front','bodice-back',...(sleeveless?[]:['sleeve']),...(['collar','stand'].includes(sp.neckline)?['collar']:[])];
 if(sleeveless&&family!=='trousers'&&family!=='skirt')notes.push('This design is sleeveless, so no sleeve piece was added.');
 const label=SIZES[size]?size:'M';
 return {name:design.name,size:label,style,blocks,notes,meas:{...DEFAULT_MEAS,...SIZES[label]}};
}
export function seedOps(seed){
 const groups=seed.blocks.map(id=>buildBlock(id,seed.meas,seed.style)).filter(g=>g.length);
 return placeGroups(groups,[]);
}
