import React, { useState } from 'react';
import { FolderKanban, Download, RefreshCw } from 'lucide-react';
import { fmtDate } from '../usage.js';
import { API, TOKEN_KEY } from '../api.js';
import { StatusPill, Empty } from '../components/ui.jsx';

async function downloadJob(id) {
  const token=localStorage.getItem(TOKEN_KEY);
  const r=await fetch(`${API}/api/workspace/jobs/${encodeURIComponent(id)}/export.zip`,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok){let d={};try{d=await r.json()}catch{}throw new Error(d.error||'Download failed');}
  const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`fabric-now-${id.slice(0,6)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function Projects({jobs,setPage}){
  const [busy,setBusy]=useState('');
  const run=async id=>{setBusy(id);try{await downloadJob(id)}catch(e){alert(e.message)}finally{setBusy('')}};
  if(!jobs.length)return <section className="panel"><Empty icon={FolderKanban} title="No projects yet" body="Pattern jobs you run appear here with their status." action={<button className="btn btn-primary" onClick={()=>setPage('studio')}>Open Pattern Studio</button>}/></section>;
  return <section className="panel flush"><div className="table-wrap"><table><thead><tr><th>Garment</th><th>Job ID</th><th>Created</th><th>Status</th><th>Export</th></tr></thead>
    <tbody>{jobs.map((j,i)=>{const id=j.id||j.job_id||'';return <tr key={id||i}><td><strong>{j.garment||j.plan?.garment||'Pattern job'}</strong>{j.plan?.style_family&&<small className="muted" style={{display:'block'}}>{j.plan.style_family}</small>}</td>
      <td><code>{id}</code></td><td>{fmtDate(j.createdAt||j.created||j.created_at)||'-'}</td><td><StatusPill status={j.status}/></td>
      <td>{j.status==='done'?<button className="btn btn-ghost" disabled={busy===id} onClick={()=>run(id)}><Download size={15}/>{busy===id?'Preparing…':'ZIP'}</button>:j.status==='processing'?<span className="muted"><RefreshCw size={14}/> Processing</span>:<span className="muted">—</span>}</td>
    </tr>})}</tbody></table></div></section>;
}
