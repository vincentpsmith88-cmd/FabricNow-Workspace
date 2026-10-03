// Fitting bodies shipped in /public/models. Measurements are in cm.
export const FIT_MODELS = [
  { id:'african-female-fat-short', label:'African Female · Fat Short', category:'Female · short / fuller', file:'african female fat short.fbx', gender:'female', measurements:{chest:108,waist:98,hip:116,height:158} },
  { id:'african-female-fat-tall', label:'African Female · Fat Tall', category:'Female · tall / fuller', file:'african female fat tall.fbx', gender:'female', measurements:{chest:112,waist:102,hip:120,height:178} },
  { id:'african-male-fat-tall', label:'African Male · Fat Tall', category:'Male · tall / fuller', file:'african male fat tall.fbx', gender:'male', measurements:{chest:116,waist:108,hip:116,height:188} },
  { id:'african-male-tall', label:'African Male · Tall', category:'Male · tall', file:'african male tall.fbx', gender:'male', measurements:{chest:104,waist:88,hip:106,height:188} },
  { id:'baby', label:'Baby', category:'Child · neutral', file:'baby.fbx', gender:'female', child:true, measurements:{chest:52,waist:50,hip:54,height:78} },
  { id:'baby-female', label:'Baby Female', category:'Child · female', file:'babyfemale.fbx', gender:'female', child:true, measurements:{chest:52,waist:50,hip:54,height:78} },
  { id:'male', label:'Male', category:'Adult · standard', file:'male.fbx', gender:'male', measurements:{chest:98,waist:82,hip:100,height:176} },
  { id:'custom', label:'Custom Model', category:'Supplied FBX · Untitled', file:'Untitled.fbx', gender:'female', measurements:{chest:92,waist:74,hip:100,height:172} },
];

export const SIZE_SCALE = { XS:.93, S:.97, M:1, L:1.04, XL:1.08, '2XL':1.13 };
