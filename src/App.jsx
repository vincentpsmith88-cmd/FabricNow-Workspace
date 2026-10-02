import React,{useEffect,useState} from 'react';
import {api,TOKEN_KEY} from './api.js';
import {getUsage,isRunning} from './usage.js';
import {Sidebar,Topbar} from './components/Shell.jsx';
import {LogoMark} from './components/Logo.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Studio from './pages/Studio.jsx';
import Lab from './pages/Lab.jsx';
import Projects from './pages/Projects.jsx';
import Analytics from './pages/Analytics.jsx';
import ApiKeys from './pages/ApiKeys.jsx';
import Usage from './pages/Usage.jsx';
import Billing from './pages/Billing.jsx';
import {Company,SettingsPage,Help} from './pages/Account.jsx';
import FashionOS from './pages/FashionOS.jsx';
import Assistant from './pages/Assistant.jsx';

const fashionPageTabs={
 'fashion-command':'command','fashion-capture':'capture','fashion-factory':'factory','fashion-production':'production','fashion-collections':'collections','fashion-marketing':'marketing','fashion-library':'library','fashion-store':'store','fashion-team':'team'
};
export default function App(){
 const [user,setUser]=useState(null);const [checking,setChecking]=useState(Boolean(localStorage.getItem(TOKEN_KEY)));const [page,setPage]=useState('overview');const [menu,setMenu]=useState(false);const [collapsed,setCollapsed]=useState(()=>localStorage.getItem('fabricnow.sidebar.collapsed')==='1');const [apiStatus,setApiStatus]=useState(null);const [jobs,setJobs]=useState([]);
 useEffect(()=>{if(!localStorage.getItem(TOKEN_KEY))return;api('/api/auth/me').then(d=>setUser(d.user)).catch(()=>localStorage.removeItem(TOKEN_KEY)).finally(()=>setChecking(false))},[]);
 useEffect(()=>{if(!user)return;Promise.allSettled([api('/api/billing/api-status'),api('/api/workspace/jobs')]).then(([a,j])=>{if(a.status==='fulfilled')setApiStatus(a.value);if(j.status==='fulfilled')setJobs(j.value.jobs||[])})},[user]);
 const anyRunning=jobs.some(isRunning);useEffect(()=>{if(!user||!anyRunning)return;const id=setInterval(()=>api('/api/workspace/jobs').then(d=>setJobs(cur=>{const fresh=new Map((d.jobs||[]).map(j=>[j.id,j]));return[...(d.jobs||[]),...cur.filter(j=>!fresh.has(j.id))].sort((x,y)=>(y.createdAt||0)-(x.createdAt||0))})).catch(()=>{}),8000);return()=>clearInterval(id)},[user,anyRunning]);
 useEffect(()=>{window.scrollTo(0,0)},[page]);useEffect(()=>{localStorage.setItem('fabricnow.sidebar.collapsed',collapsed?'1':'0')},[collapsed]);
 if(checking)return <div className="splash"><LogoMark size={44}/></div>;if(!user)return <Login onAuth={setUser}/>;
 const logout=()=>{localStorage.removeItem(TOKEN_KEY);setUser(null);setJobs([]);setApiStatus(null);setPage('overview')};const usage=getUsage(apiStatus);const addJob=j=>setJobs(js=>[j,...js.filter(x=>x.id!==j.id)]);const updateJob=j=>setJobs(js=>js.some(x=>x.id===j.id)?js.map(x=>x.id===j.id?{...x,...j}:x):[j,...js]);const removeJob=id=>setJobs(js=>js.filter(j=>j.id!==id));
 const tab=fashionPageTabs[page];
 const view={overview:<Overview user={user} apiStatus={apiStatus} jobs={jobs} setPage={setPage}/>,studio:<Studio onDone={addJob} onJob={updateJob} onDeleted={removeJob} setPage={setPage}/>,lab:<Lab onDone={addJob} onJob={updateJob} onDeleted={removeJob} setPage={setPage}/>,projects:<Projects jobs={jobs} setPage={setPage} onJob={updateJob} onDeleted={removeJob}/>,analytics:<Analytics jobs={jobs}/>,keys:<ApiKeys/>,usage:<Usage apiStatus={apiStatus} setPage={setPage}/>,billing:<Billing apiStatus={apiStatus}/>,company:<Company user={user}/>,settings:<SettingsPage user={user}/>,help:<Help/>,assistant:<Assistant/>,...Object.fromEntries(Object.keys(fashionPageTabs).map(id=>[id,<FashionOS initialTab={fashionPageTabs[id]} setPage={setPage}/>]))}[page];
 return <div className={`app ${collapsed?'sidebar-collapsed':''}`}><Sidebar page={page} setPage={setPage} open={menu} close={()=>setMenu(false)} user={user} usage={usage} collapsed={collapsed} onToggle={()=>setCollapsed(v=>!v)}/><div className="main"><Topbar page={page} setPage={setPage} openMenu={()=>setMenu(true)} user={user} onLogout={logout}/><main className="content"><div className="page" key={page}><ErrorBoundary resetKey={page}>{view}</ErrorBoundary></div></main></div></div>
}
