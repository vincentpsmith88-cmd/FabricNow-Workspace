import React from 'react';
import { ExternalLink, Sun, Moon } from 'lucide-react';
import EmptyPage, { ExternalAction } from './EmptyPage.jsx';
import { useTheme } from '../theme.js';
import { PLAN, money, api } from '../api.js';
import { companyName } from '../usage.js';

const SITE = 'https://fabricnow.tonasel.com';
function Notice({error,ok}){if(!error&&!ok)return null;return <div className={error?'error':'success-panel'} role="status">{error||ok}</div>}

export function Company({ user, companyContext, onCompanyChange }) {
  const [members,setMembers]=React.useState([]); const [newCompany,setNewCompany]=React.useState(''); const [invite,setInvite]=React.useState({email:'',role:'designer'}); const [notice,setNotice]=React.useState(''); const [error,setError]=React.useState(''); const [busy,setBusy]=React.useState(false); const [inviteLink,setInviteLink]=React.useState('');
  const current=companyContext?.currentCompany; const canManage=['owner','admin'].includes(companyContext?.membership?.role);
  const loadMembers=()=>api('/api/companies/members').then(d=>setMembers(d.members||[])).catch(e=>setError(e.message));
  React.useEffect(()=>{if(current)loadMembers()},[current?.id]);
  if(!current) return <EmptyPage type="company" eyebrow="COMPANY" title="Loading company workspace" body="Your company access and memberships are being loaded from the backend."/>;
  const sendInvite=async()=>{setBusy(true);setError('');setNotice('');setInviteLink('');try{const d=await api('/api/companies/members/invite',{method:'POST',body:JSON.stringify(invite)});setInvite({email:'',role:'designer'});setInviteLink(`${window.location.origin}${d.invitation.acceptPath}`);setNotice('Invitation created. Copy the secure invitation link and send it to the invited person.');loadMembers()}catch(e){setError(e.message)}finally{setBusy(false)}};
  const updateMember=async(m,patch)=>{try{await api(`/api/companies/members/${m.id}`,{method:'PATCH',body:JSON.stringify(patch)});loadMembers()}catch(e){setError(e.message)}};
  const createCompany=async()=>{if(!newCompany.trim())return;setBusy(true);try{const d=await api('/api/companies',{method:'POST',body:JSON.stringify({name:newCompany.trim()})});setNewCompany('');setNotice(`Company ${d.company.name} created.`);onCompanyChange(d.company.id)}catch(e){setError(e.message)}finally{setBusy(false)}};
  return <div className="settings-stack">
    <section className="panel"><div className="panel-head"><div><h3>{current.name}</h3><p className="muted small-text">Company workspace · only active members can access its Fashion OS data.</p></div><span className="tag ok">{companyContext.membership.role} access</span></div><dl className="kv"><div><dt>Company</dt><dd>{current.name}</dd></div><div><dt>Signed-in user</dt><dd>{user.name} · {user.email}</dd></div><div><dt>Workspace ID</dt><dd>{current.id}</dd></div></dl><div className="data-form-grid" style={{marginTop:18}}><label className="field">Create another company<input value={newCompany} onChange={e=>setNewCompany(e.target.value)} placeholder="New company name"/></label><div className="module-actions" style={{alignItems:'end'}}><button className="btn btn-ghost" disabled={!newCompany.trim()||busy} onClick={createCompany}>Create company</button></div></div>{companyContext.companies?.length>1&&<label className="field" style={{marginTop:18}}>Switch company<select value={current.id} onChange={e=>onCompanyChange(e.target.value)}>{companyContext.companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}</section>
    <section className="panel"><div className="panel-head"><div><h3>Team access</h3><p className="muted small-text">Membership is explicit. Being a FabricNow user does not grant access to another company.</p></div></div>{canManage&&<div className="data-form-grid"><label className="field">Invite email<input type="email" value={invite.email} onChange={e=>setInvite({...invite,email:e.target.value})} placeholder="designer@company.com"/></label><label className="field">Role<select value={invite.role} onChange={e=>setInvite({...invite,role:e.target.value})}>{['designer','merchandiser','reviewer','production','marketing','admin'].map(r=><option key={r}>{r}</option>)}</select></label><div className="module-actions" style={{alignItems:'end'}}><button className="btn btn-primary" disabled={busy||!invite.email} onClick={sendInvite}>{busy?'Creating…':'Invite member'}</button></div></div>}{inviteLink&&<div className="success-panel" style={{marginTop:14}}><strong>Invitation link created</strong><input value={inviteLink} readOnly onFocus={e=>e.target.select()} style={{width:'100%',padding:10,border:'1px solid var(--line)',borderRadius:8}}/></div>}<Notice error={error} ok={notice}/><ul className="rows" style={{marginTop:18}}>{members.map(m=><li key={m.id}><div><strong>{m.user?.name||m.user?.email||'Pending member'}</strong><small>{m.user?.email||'No account yet'} · {m.role}</small></div>{canManage&&m.role!=='owner'?<><select value={m.role} onChange={e=>updateMember(m,{role:e.target.value})}><option>designer</option><option>merchandiser</option><option>reviewer</option><option>production</option><option>marketing</option><option>admin</option></select><button className="btn btn-ghost" onClick={()=>updateMember(m,{status:m.status==='active'?'disabled':'active'})}>{m.status==='active'?'Disable':'Enable'}</button></>:<span className="tag">{m.status}</span>}</li>)}</ul></section>
    <section className="panel"><div className="panel-head"><div><h3>Company permissions model</h3><p className="muted small-text">Roles provide defaults; owners/admins can manage membership and integrations.</p></div></div><div className="permission-list"><span className="permission-chip">Owner · everything</span><span className="permission-chip">Admin · company management</span><span className="permission-chip">Designer · products + fabrics + tech packs</span><span className="permission-chip">Production · production + quality</span><span className="permission-chip">Reviewer · quality review</span><span className="permission-chip">Marketing · collections + marketing</span></div></section>
  </div>;
}
export function SettingsPage({ user }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <div className="settings-stack">
      <EmptyPage type="settings" eyebrow="SETTINGS" title="Workspace preferences" body="Your account details are read from the signed-in workspace. Device appearance is saved locally; no placeholder settings are presented." />
      <section className="panel">
        <div className="panel-head"><div><h3>Your profile</h3><p className="muted small-text">Personal details for your FabricNow workspace.</p></div></div>
        <dl className="kv">
          <div><dt>Name</dt><dd>{user.name}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
        </dl>
      </section>
      <section className="panel appearance-panel">
        <div className="panel-head">
          <div><h3>Appearance</h3><p className="muted small-text">Choose how FabricNow looks on this device. Your preference is saved automatically.</p></div>
        </div>
        <button className="appearance-choice" onClick={toggleTheme} aria-pressed={theme === 'dark'}>
          <span className="appearance-choice-icon">{theme === 'dark' ? <Moon size={20}/> : <Sun size={20}/>}</span>
          <span><strong>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</strong><small>Currently active · Click to switch</small></span>
          <span className="appearance-switch"><i className={theme === 'dark' ? 'on' : ''}/></span>
        </button>
      </section>
    </div>
  );
}

export function Help() {
  const links = [
    ['API for Developers', 'Endpoints, authentication and usage', `${SITE}/developers`],
    ['Help Center', 'Answers to common workspace questions', `${SITE}/help`],
    ['Download & Licensing', 'What you can do with generated files', `${SITE}/licensing`],
    ['Contact us', 'Talk to the FabricNow team', `${SITE}/contact`],
  ];
  return <div className="help-page">
    <EmptyPage type="help" eyebrow="HELP & DOCS" title="Your knowledge hub is ready" body="Use the live documentation and support resources below. FabricNow keeps this workspace free of invented articles or offline placeholder content." />
    <section className="panel help-links-panel">
      <div className="panel-head"><div><h3>Resources</h3><p className="muted small-text">Open the source maintained by the FabricNow team.</p></div></div>
      <ul className="rows link-rows">{links.map(([t,d,href])=><li key={t}><div><strong>{t}</strong><small>{d}</small></div><a className="btn btn-ghost" href={href} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a></li>)}</ul>
    </section>
  </div>;
}
