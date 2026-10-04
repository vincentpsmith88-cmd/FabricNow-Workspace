// Fitting bodies shipped in /public/models. Measurements are in cm.
// landmarks: heights of the underarm (yUA), waist (yW), hip (yH) and crotch (yCrotch) as a fraction of body height (feet = 0).
// They were measured once on the shared body mesh and are used to fit garments from Tailor Tools onto each model.
export const FIT_MODELS = [
  { id:'african-female-fat-short', label:'African Female · Fat Short', category:'Female · short / fuller', file:'african female fat short.fbx', landmarks:{yUA:0.6845,yW:0.5811,yH:0.4143,yCrotch:0.3514}, gender:'female', measurements:{chest:108,waist:98,hip:116,height:158} },
  { id:'african-female-fat-tall', label:'African Female · Fat Tall', category:'Female · tall / fuller', file:'african female fat tall.fbx', landmarks:{yUA:0.7516,yW:0.65,yH:0.4954,yCrotch:0.4366}, gender:'female', measurements:{chest:112,waist:102,hip:120,height:178} },
  { id:'african-male-fat-tall', label:'African Male · Fat Tall', category:'Male · tall / fuller', file:'african male fat tall.fbx', landmarks:{yUA:0.7614,yW:0.6511,yH:0.5061,yCrotch:0.4528}, gender:'male', measurements:{chest:116,waist:108,hip:116,height:188} },
  { id:'african-male-tall', label:'African Male · Tall', category:'Male · tall', file:'african male tall.fbx', landmarks:{yUA:0.7583,yW:0.6579,yH:0.5257,yCrotch:0.4742}, gender:'male', measurements:{chest:104,waist:88,hip:106,height:188} },
  { id:'baby', label:'Baby', category:'Child · neutral', file:'baby.fbx', landmarks:{yUA:0.6797,yW:0.5581,yH:0.3916,yCrotch:0.3494}, gender:'female', child:true, measurements:{chest:52,waist:50,hip:54,height:78} },
  { id:'baby-female', label:'Baby Female', category:'Child · female', file:'babyfemale.fbx', landmarks:{yUA:0.6801,yW:0.5582,yH:0.3911,yCrotch:0.3481}, gender:'female', child:true, measurements:{chest:52,waist:50,hip:54,height:78} },
  { id:'male', label:'Male', category:'Adult · standard', file:'male.fbx', landmarks:{yUA:0.734,yW:0.6351,yH:0.4908,yCrotch:0.4439}, gender:'male', measurements:{chest:98,waist:82,hip:100,height:176} },
  { id:'custom', label:'Custom Model', category:'Supplied FBX · Untitled', file:'Untitled.fbx', landmarks:{yUA:0.7351,yW:0.6263,yH:0.472,yCrotch:0.4203}, gender:'female', measurements:{chest:92,waist:74,hip:100,height:172} },
];

export const SIZE_SCALE = { XS:.93, S:.97, M:1, L:1.04, XL:1.08, '2XL':1.13 };
