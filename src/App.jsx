import React,{useEffect,useState} from 'react';
import {api,TOKEN_KEY} from './api.js';
import {loadCompanyContext,selectCompany} from './company.js';
import {getUsage,isRunning} from './usage.js';
import {Sidebar,Topbar,BottomNav} from './components/Shell.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import UsageAlert from './components/UsageAlert.jsx';
import {LogoMark} from './components/Logo.jsx';
import {Skeleton} from './components/ui.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Studio from './pages/Studio.jsx';
import TailorTools from './pages/TailorTools.jsx';
import FitModels from './pages/FitModels.jsx';
import Lab from './pages/Lab.jsx';
import Projects from './pages/Projects.jsx';
import Analytics from './pages/Analytics.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import Usage from './pages/Usage.jsx';
import Billing from './pages/Billing.jsx';
import {Company,SettingsPage,Help} from './pages/Account.jsx';
import FashionOS from './pages/FashionOS.jsx';
import Assistant from './pages/Assistant.jsx';
import {GarmentLibrary,FabricLibrary,MeasurementStudio,TechPacks,ProductionBoard,QualityControl,Integrations} from './pages/ProfessionalModules.jsx';
import PinterestResearch from './pages/PinterestResearch.jsx';
import Gallery from './pages/Gallery.jsx';
import PatternLibrary from './pages/PatternLibrary.jsx';

const fashionPageTabs={
 'fashion-command':'command','fashion-capture':'capture','fashion-factory':'factory','fashion-production':'production','fashion-collections':'collections','fashion-marketing':'marketing','fashion-library':'library','fashion-store':'store','fashion-team':'team'
};
export default function App(){
 const [user,setUser]=useState(null);const [companyContext,setCompanyContext]=useState(null);const [companyLoading,setCompanyLoading]=useState(false);const [checking,setChecking]=useState(Boolean(localStorage.getItem(TOKEN_KEY)));const [page,setPage]=useState('overview');const [menu,setMenu]=useState(false);const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('fabricnow.sidebar.collapsed')==='1');const [apiStatus,setApiStatus]=useState(null);const [jobs,setJobs]=useState([]);const [palette,setPalette]=useState(false);const [health,setHealth]=useState(null);
 useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPalette(p=>!p)}};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[]);
 useEffect(()=>{if(!user)return;let live=true;
 const inviteToken=window.location.pathname.startsWith('/company-invitations/')?window.location.pathname.split('/').filter(Boolean).pop():'';
 const acceptInvite=inviteToken?api('/api/companies/invitations/accept',{method:'POST',body:JSON.stringify({token:inviteToken})}).catch(()=>null):Promise.resolve();
 acceptInvite.then(()=>{if(inviteToken)window.history.replaceState({},'', '/');});
 const loadCompanies=async()=>{setCompanyLoading(true);try{let ctx;try{ctx=await loadCompanyContext()}catch(e){selectCompany();ctx=await loadCompanyContext()}if(live)setCompanyContext(ctx)}catch(e){if(live)setCompanyContext(null)}finally{if(live)setCompanyLoading(false)}};loadCompanies();return()=>{live=false};
},[user]);
 useEffect(()=>{if(!user)return;let live=true;const ping=()=>api('/api/workspace/health').then(d=>live&&setHealth(d.engine===true?'ok':'engine')).catch(()=>live&&setHealth('api'));ping();const id=setInterval(ping,60000);return()=>{live=false;clearInterval(id)}},[user]);
 useEffect(()=>{if(!localStorage.getItem(TOKEN_KEY))return;api('/api/auth/me').then(d=>setUser(d.user)).catch(()=>localStorage.removeItem(TOKEN_KEY)).finally(()=>setChecking(false))},[]);
 useEffect(()=>{if(!user)return;Promise.allSettled([api('/api/billing/api-status'),api('/api/workspace/jobs')]).then(([a,j])=>{if(a.status==='fulfilled')setApiStatus(a.value);if(j.status==='fulfilled')setJobs(j.value.jobs||[])})},[user]);
 const anyRunning=jobs.some(isRunning);useEffect(()=>{if(!user||!anyRunning)return;const id=setInterval(()=>api('/api/workspace/jobs').then(d=>setJobs(cur=>{const fresh=new Map((d.jobs||[]).map(j=>[j.id,j]));return[...(d.jobs||[]),...cur.filter(j=>!fresh.has(j.id))].sort((x,y)=>(y.createdAt||0)-(x.createdAt||0))})).catch(()=>{}),8000);return()=>clearInterval(id)},[user,anyRunning]);
 useEffect(()=>{window.scrollTo(0,0)},[page]);useEffect(()=>{localStorage.setItem('fabricnow.sidebar.collapsed',collapsed?'1':'0')},[collapsed]);
 if(checking)return <div className="splash splash-modern"><LogoMark size={44}/><div className="splash-skeleton"><Skeleton width="180px" height={12}/><Skeleton width="120px" height={9}/></div></div>;if(!user)return <Login onAuth={setUser}/>;if(companyLoading||!companyContext)return <div className="splash splash-modern"><LogoMark size={44}/><div className="splash-skeleton"><Skeleton width="210px" height={13}/><Skeleton width="150px" height={9}/><Skeleton width="180px" height={9}/></div></div>;
 const logout=()=>{localStorage.removeItem(TOKEN_KEY);selectCompany();setUser(null);setCompanyContext(null);setJobs([]);setApiStatus(null);setPage('overview')};
 const changeCompany=async(id)=>{selectCompany(id);setCompanyLoading(true);try{const ctx=await loadCompanyContext();setCompanyContext(ctx);setPage('overview')}catch(e){selectCompany();const ctx=await loadCompanyContext();setCompanyContext(ctx);setPage('overview')}finally{setCompanyLoading(false)}};const usage=getUsage(apiStatus);const addJob=j=>setJobs(js=>[j,...js.filter(x=>x.id!==j.id)]);const updateJob=j=>setJobs(js=>js.some(x=>x.id===j.id)?js.map(x=>x.id===j.id?{...x,...j}:x):[j,...js]);const removeJob=id=>setJobs(js=>js.filter(j=>j.id!==id));
 const tab=fashionPageTabs[page];
 const view={overview:<Overview user={user} apiStatus={apiStatus} jobs={jobs} setPage={setPage}/>,studio:<Studio onDone={addJob} onJob={updateJob} onDeleted={removeJob} setPage={setPage}/>, 'tailor-tools':<TailorTools setPage={setPage}/>, 'fit-models':<FitModels setPage={setPage}/>, 'pattern-library':<PatternLibrary setPage={setPage}/>,lab:<Lab onDone={addJob} onJob={updateJob} onDeleted={removeJob} setPage={setPage}/>,projects:<Projects jobs={jobs} setPage={setPage} onJob={updateJob} onDeleted={removeJob}/>,analytics:<Analytics jobs={jobs}/>,keys:<ApiKeys/>,usage:<Usage apiStatus={apiStatus} setPage={setPage}/>,billing:<Billing apiStatus={apiStatus}/>,company:<Company user={user} companyContext={companyContext} onCompanyChange={changeCompany} />,settings:<SettingsPage user={user}/>,help:<Help/>,assistant:<Assistant/>,"garment-library":<GarmentLibrary setPage={setPage}/>,"fabric-library":<FabricLibrary/>,"measurement-studio":<MeasurementStudio/>,"tech-packs":<TechPacks/>,"production-board":<ProductionBoard/>,"quality-control":<QualityControl/>,integrations:<Integrations/>,"pinterest-research":<PinterestResearch setPage={setPage}/>,"inspiration-library":<PinterestResearch setPage={setPage} libraryOnly/>,gallery:<Gallery setPage={setPage}/>,...Object.fromEntries(Object.keys(fashionPageTabs).map(id=>[id,<FashionOS initialTab={fashionPageTabs[id]} setPage={setPage}/>]))}[page];
 return <div className={`app ${collapsed?'sidebar-collapsed':''}`}><a className="skip-link" href="#main">Skip to content</a><Sidebar page={page} setPage={setPage} open={menu} close={()=>setMenu(false)} user={user} usage={usage} companyContext={companyContext} onCompanyChange={changeCompany} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)}/><div className="main"><Topbar page={page} setPage={setPage} openMenu={()=>setMenu(true)} user={user} companyContext={companyContext} onLogout={logout} onSearch={()=>setPalette(true)} health={health}/><main className="content" id="main"><UsageAlert key={`${usage.used>=usage.limit}-${Math.round(usage.used/Math.max(1,usage.limit)*100)>=80}`} usage={usage} setPage={setPage}/><div className="page" key={page}><ErrorBoundary resetKey={page}>{view}</ErrorBoundary></div></main></div><BottomNav page={page} setPage={setPage} openMenu={()=>setMenu(true)}/><CommandPalette open={palette} onClose={()=>setPalette(false)} setPage={setPage} jobs={jobs} onLogout={logout}/></div>
}
