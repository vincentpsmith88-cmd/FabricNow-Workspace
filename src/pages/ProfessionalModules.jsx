import React,{useState} from 'react';
import {ArrowRight,Database,FileText,FolderOpen,Images,Layers3,Plus,Shirt,Sparkles,ShieldCheck,Store,Ruler,Kanban,Palette,Boxes,Users,Scissors} from 'lucide-react';

function Shell({eyebrow,title,description,actions,children}){return <div className="pm-page"><div className="pm-head"><div><div className="pm-eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div><div className="pm-actions">{actions}</div></div>{children}</div>}

function EmptyState({icon:Icon=FolderOpen,label='READY WHEN YOU ARE',title,body,primary,secondary,onPrimary,onSecondary}){
 return <div className="library-empty fashion-module-empty">
   <div className="library-empty-visual">
     <div className="library-empty-orb"><Icon size={28}/></div>
     <span className="empty-float empty-float-a"><Images size={16}/></span>
     <span className="empty-float empty-float-b"><Sparkles size={16}/></span>
     <span className="empty-float empty-float-c"><Layers3 size={16}/></span>
   </div>
   <div className="library-empty-copy">
     <span className="library-empty-label">{label}</span>
     <h4>{title}</h4>
     <p>{body}</p>
     <div className="library-empty-actions">
       {primary&&<button className="btn btn-primary" onClick={onPrimary}>{primary}<ArrowRight size={15}/></button>}
       {secondary&&<button className="btn btn-ghost" onClick={onSecondary}>{secondary}</button>}
     </div>
   </div>
 </div>
}

export function GarmentLibrary({setPage}){return <Shell eyebrow="DESIGN · GARMENT INTELLIGENCE" title="Garment Library" description="Your company garment records will appear here once products are created in the backend." actions={<button className="btn btn-primary" onClick={()=>setPage('fashion-capture')}><Plus size={15}/> Add garment</button>}><EmptyState icon={Shirt} label="YOUR GARMENT LIBRARY IS READY" title="No garments yet" body="Create your first product from Product Capture. Once saved, the backend will store the garment record here for your team to review and reuse." primary="Open Product Capture" onPrimary={()=>setPage('fashion-capture')}/></Shell>}

export function FabricLibrary(){return <Shell eyebrow="MATERIALS · FABRIC INTELLIGENCE" title="Fabric Library" description="Company fabric records will be stored in your backend and shared across the workspace." actions={<button className="btn btn-primary"><Plus size={15}/> Add fabric</button>}><EmptyState icon={Palette} label="YOUR MATERIAL LIBRARY IS READY" title="No fabrics yet" body="There are no fabric records in this company workspace yet. Add materials when your team is ready, and they will become available here across your production workflow." primary="Add first fabric"/></Shell>}

export function MeasurementStudio(){return <Shell eyebrow="PRODUCTION · FIT SYSTEM" title="Measurements & Size Profiles" description="Create reusable size profiles only when your company has measurement data in the backend." actions={<button className="btn btn-primary"><Plus size={15}/> New size profile</button>}><EmptyState icon={Ruler} label="YOUR FIT SYSTEM IS READY" title="No size profiles yet" body="Your workspace does not have any saved measurement profiles. Create a company size profile to start standardizing fit across products." primary="Create size profile"/></Shell>}

export function TechPacks(){return <Shell eyebrow="PRODUCTION · TECHNICAL DOCUMENTS" title="Tech Pack Builder" description="Production documents will appear here after a garment and its technical data have been saved." actions={<button className="btn btn-primary"><FileText size={15}/> Create tech pack</button>}><EmptyState icon={FileText} label="TECHNICAL WORKSPACE IS READY" title="No tech packs yet" body="Once your company has an approved garment with production data, its technical package can be created and stored here." primary="Create first tech pack"/></Shell>}

export function ProductionBoard(){return <Shell eyebrow="PRODUCTION · WORKFLOW" title="Production Board" description="Track real company production records from the backend. Empty columns are intentionally kept clean until work exists." actions={<button className="btn btn-primary"><Plus size={15}/> Add work item</button>}><EmptyState icon={Kanban} label="YOUR PRODUCTION BOARD IS READY" title="No production work yet" body="There are no production items in this workspace. Create or approve a product and it can enter the production workflow here." primary="Create work item"/></Shell>}

export function QualityControl(){return <Shell eyebrow="AI QUALITY · HUMAN REVIEW" title="AI Quality Control" description="Quality audits will appear here after the backend receives products for review." actions={<button className="btn btn-primary"><ShieldCheck size={15}/> Run new audit</button>}><EmptyState icon={ShieldCheck} label="QUALITY CONTROL IS READY" title="No quality audits yet" body="Your review queue is empty. When products are processed by the AI pipeline, their quality checks and human-review tasks will appear here." primary="Open Product Capture"/></Shell>}

export function Integrations(){return <Shell eyebrow="DEVELOPERS · CONNECTED WORKFLOWS" title="Integrations & API" description="Connect your company systems when you are ready. Nothing is shown as connected until the backend confirms it." actions={<button className="btn btn-primary"><Plus size={15}/> Add integration</button>}><EmptyState icon={Database} label="YOUR CONNECTIONS ARE READY" title="No integrations connected" body="Your workspace has no active integrations yet. Connect storage, commerce, production or internal systems and their live status will appear here." primary="Add first integration"/></Shell>}
