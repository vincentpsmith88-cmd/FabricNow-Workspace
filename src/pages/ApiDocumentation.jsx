import React from 'react';
import { BookOpen, ArrowRight, CheckCircle2, Code2, Database, Layers3, Sparkles, ShieldCheck, Workflow } from 'lucide-react';

const sections = [
  {id:'overview', title:'Overview'},
  {id:'system', title:'System design'},
  {id:'garment', title:'Garment intelligence'},
  {id:'fabric', title:'Fabric generation'},
  {id:'pattern', title:'Pattern generation'},
  {id:'tailor', title:'Tailor Tools'},
  {id:'studio', title:'Design Studio'},
  {id:'assets', title:'Assets & conversion'},
  {id:'production', title:'Production APIs'},
];

const endpoints = [
  ['Garment processing','POST','/api/workspace/patterns','Upload a garment photo and optional swatch; returns a pattern job.'],
  ['AI garment tools','POST','/api/workspace/tools/:kind','Generate print, colorways, fabric, flats, mockups or Aso-Ebi assets.'],
  ['Fabric analysis','POST','/api/workspace-suite/fabrics/ai-analyze','Analyze a fabric image and return structured fabric information.'],
  ['Fabric swatch','POST','/api/workspace-suite/fabrics/ai-swatch','Generate a reusable fabric swatch from an image.'],
  ['AI pattern','POST','/api/pattern-library/ai','Describe a pattern or provide a reference image and generate a structured pattern design.'],
  ['Tailor AI','POST','/api/tailor-tools/ai','Generate tailoring operations from project, measurements, fabric and board context.'],
  ['Stitch plan','POST','/api/tailor-tools/stitch-plan','Generate a production stitch plan from tailoring operations.'],
  ['Cutting layout','POST','/api/tailor-tools/cutting-layout','Generate cutting-layout guidance from pattern and fabric context.'],
  ['Pattern validation','POST','/api/tailor-tools/boards/:id/validate','Validate board operations before production/export.'],
  ['PNG → SVG','POST','/api/convert/png-to-svg','Trace a raster image into SVG.'],
  ['Background removal','POST','/api/convert/remove-background','Return a transparent PNG from a product/garment image.'],
  ['Pose processing','POST','/api/pose-tool/process','Process a model/pose image through the pose workflow.'],
  ['Garment segmentation','POST','/api/garment-tool/process','Extract the garment and return the garment package/parts.'],
];

function Endpoint({item}){return <div className="api-endpoint"><div><strong>{item[0]}</strong><p>{item[3]}</p></div><code><b>{item[1]}</b> {item[2]}</code></div>}

export default function ApiDocumentation({setPage}){
 return <div className="api-doc-page">
  <div className="api-doc-hero">
   <div><span className="studio-eyebrow"><BookOpen size={13}/> DEVELOPER DOCUMENTATION</span><h2>Build with FabricNow APIs.</h2><p>Use the same fashion intelligence that powers the workspace from your own application. Generate fabrics, create patterns, run tailoring workflows, prepare production assets and connect your own studio.</p></div>
   <button className="btn btn-primary" onClick={()=>setPage('api-playground')}><Code2 size={16}/> Open API Playground <ArrowRight size={15}/></button>
  </div>

  <div className="api-doc-layout">
   <aside className="api-doc-toc">{sections.map(s=><a key={s.id} href={`#${s.id}`}>{s.title}</a>)}</aside>
   <article className="api-doc-content">
    <section id="overview" className="api-doc-section"><span className="api-kicker">01 · OVERVIEW</span><h3>One API layer for the complete fashion workflow</h3><p>FabricNow is organized around a company-scoped API. The workspace, Design Studio, Tailor Tools and external integrations use the same domain services, so an operation tested in the Playground can be promoted into your application without creating a second implementation.</p><div className="api-feature-grid"><Feature icon={Sparkles} title="AI generation" text="Fabric, pattern, tailoring, flats, mockups and other fashion assets."/><Feature icon={Layers3} title="Structured outputs" text="Keep generated designs, boards, projects and production data reusable."/><Feature icon={ShieldCheck} title="Company scoped" text="Authenticated requests are associated with the active company workspace."/></div></section>
    <section id="system" className="api-doc-section"><span className="api-kicker">02 · SYSTEM DESIGN</span><h3>The architecture</h3><p>The frontend should stay a presentation and orchestration layer. AI credentials and provider logic remain in the backend. Domain APIs expose stable contracts to both the workspace UI and your integrations.</p><div className="system-flow"><Flow icon={Code2} title="Client apps" text="FabricNow UI · your app · API Playground"/><i>→</i><Flow icon={Workflow} title="API layer" text="Auth · company context · permissions · limits"/><i>→</i><Flow icon={Sparkles} title="Domain services" text="Fabric · pattern · tailor · garment · production"/><i>→</i><Flow icon={Database} title="Data + AI" text="Projects · assets · boards · AI providers"/></div><div className="api-note"><CheckCircle2 size={17}/><span><strong>Design rule:</strong> add new capabilities to the backend domain API first, then expose them in the workspace and Playground. Do not put provider secrets or AI business logic in the frontend.</span></div></section>
    <section id="garment" className="api-doc-section"><span className="api-kicker">03 · GARMENT INTELLIGENCE</span><h3>From garment photo to production data</h3><p>The garment pipeline accepts a source image and can progress through garment understanding, pattern jobs, grading and production preparation. The Playground lets you test these calls before wiring them into another product.</p><Endpoint item={endpoints[0]}/><Endpoint item={endpoints[1]}/></section>
    <section id="fabric" className="api-doc-section"><span className="api-kicker">04 · FABRIC</span><h3>Fabric analysis & generation</h3><p>Send a fabric reference to the backend and receive structured information or a generated swatch. These outputs can be attached to projects, tailoring boards and product records.</p><Endpoint item={endpoints[2]}/><Endpoint item={endpoints[3]}/></section>
    <section id="pattern" className="api-doc-section"><span className="api-kicker">05 · PATTERNS</span><h3>Pattern generation</h3><p>Pattern Studio and Pattern Library are backed by structured pattern APIs. A request can be text-only or include an image/reference specification. The response is persisted as a pattern design so it can be reused by the workspace.</p><Endpoint item={endpoints[4]}/><Endpoint item={endpoints[0]}/></section>
    <section id="tailor" className="api-doc-section"><span className="api-kicker">06 · TAILOR TOOLS</span><h3>Design, validate and prepare tailoring operations</h3><p>Tailor Tools uses a board model containing operations, layers, measurements and fabric context. AI can propose operations, stitch plans and cutting layouts; deterministic validation checks the board before export.</p><Endpoint item={endpoints[5]}/><Endpoint item={endpoints[6]}/><Endpoint item={endpoints[7]}/><Endpoint item={endpoints[8]}/></section>
    <section id="studio" className="api-doc-section"><span className="api-kicker">07 · DESIGN STUDIO</span><h3>Keep the studio and external apps in sync</h3><p>Design Studio is the visual layer over the same domain services. A future client can create a project, attach source images and fabric data, invoke generation APIs, then save resulting assets into the workspace library. This keeps the workflow consistent across browser, mobile or a custom production application.</p><div className="api-code-card"><div className="api-code-head"><span>Typical client flow</span><code>POST /api/...</code></div><pre>{`1. Authenticate user
2. Select company context
3. Upload reference / source image
4. Call generation endpoint
5. Save returned design/job/asset
6. Validate + review
7. Send to production / export`}</pre></div></section>
    <section id="assets" className="api-doc-section"><span className="api-kicker">08 · ASSETS & CONVERSION</span><h3>Prepare files for downstream tools</h3><p>Use SVG conversion and background removal for clean technical assets, pattern references and product imagery. These operations can be combined with garment and pattern workflows.</p><Endpoint item={endpoints[9]}/><Endpoint item={endpoints[10]}/><Endpoint item={endpoints[11]}/></section>
    <section id="production" className="api-doc-section"><span className="api-kicker">09 · PRODUCTION</span><h3>Move generated work into production</h3><p>Once designs are approved, the workspace APIs provide measurements, tech packs, production boards, quality control, projects, asset library and store export modules. Keep these as domain records instead of treating every AI result as a disposable image.</p><div className="api-module-grid">{['Projects','Measurements','Tech Packs','Production','Quality Control','Asset Library','Collections','Store Export'].map(x=><span key={x}>{x}<CheckCircle2 size={14}/></span>)}</div></section>
    <div className="api-doc-footer"><div><strong>Ready to test an endpoint?</strong><span>Open the Playground and use your current signed-in workspace context.</span></div><button className="btn btn-primary" onClick={()=>setPage('api-playground')}>Open Playground <ArrowRight size={15}/></button></div>
   </article>
  </div>
 </div>
}
function Feature({icon:Icon,title,text}){return <div className="api-feature"><span><Icon size={17}/></span><strong>{title}</strong><p>{text}</p></div>}
function Flow({icon:Icon,title,text}){return <div className="system-node"><span><Icon size={17}/></span><strong>{title}</strong><small>{text}</small></div>}
