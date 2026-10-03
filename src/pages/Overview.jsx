import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, Factory, FolderKanban, Image as ImageIcon, KeyRound, Scissors, ShieldCheck, Shirt, Sparkles, Wallet } from 'lucide-react';
import { api, PLAN, money } from '../api.js';
import { getUsage, isDone, isFailed, fmtDate, dailySeries, tally, cap, jobTitle, jobDate } from '../usage.js';
import { StatusPill, Segmented, Meter } from '../components/ui.jsx';
import { LineChart } from '../components/Charts.jsx';
import { Delta, HBars, KpiCard, KpiGrid, Panel, ProEmpty, Ring } from '../components/kit.jsx';
import Onboarding from '../components/Onboarding.jsx';

const RANGES = [{ value: 7, label: '7D' }, { value: 30, label: '30D' }, { value: 90, label: '90D' }];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const countBetween = (jobs, fromAgo, toAgo) => {
  const now = Date.now(), day = 86400000;
  return jobs.filter((j) => { const d = jobDate(j); if (!d) return false; const age = (now - d.getTime()) / day; return age >= toAgo && age < fromAgo; }).length;
};

export default function Overview({ user, apiStatus, jobs, setPage }) {
  const [days, setDays] = useState(30);
  const [dash, setDash] = useState(undefined); // undefined = loading, null = unavailable
  const u = getUsage(apiStatus);
  const first = (user.name || '').split(' ')[0];

  useEffect(() => {
    let live = true;
    api('/api/workspace-suite/dashboard').then((d) => live && setDash(d?.metrics || null)).catch(() => live && setDash(null));
    return () => { live = false; };
  }, []);

  const done = jobs.filter(isDone).length;
  const failed = jobs.filter(isFailed).length;
  const decided = done + failed;
  const series = useMemo(() => dailySeries(jobs, days), [jobs, days]);
  const total = series.reduce((a, b) => a + b.value, 0);
  const spark = useMemo(() => dailySeries(jobs, 14).map((d) => d.value), [jobs]);
  const last30 = countBetween(jobs, 30, 0), prev30 = countBetween(jobs, 60, 30);
  const byGarment = useMemo(() => tally(jobs, (j) => cap(String(j.garment || 'Other').replace(/-/g, ' '))), [jobs]);
  const pct = u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0;

  const quick = [
    ['studio', Scissors, 'New pattern job'], ['fashion-capture', Shirt, 'Capture product'],
    ['production-board', Factory, 'Add work item'], ['quality-control', ShieldCheck, 'Run audit'],
  ];

  return (
    <div className="wp">
      <header className="wp-hero">
        <div>
          <span className="wp-eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span>
          <h2>{first ? `${greeting()}, ${first}.` : `${greeting()}.`}</h2>
          <p>{last30 ? `Your team ran ${last30} pattern ${last30 === 1 ? 'job' : 'jobs'} in the last 30 days.` : 'Generate garment pattern assets and keep an eye on your allowance.'} Here’s how your workspace is doing.</p>
        </div>
        <div className="wp-quick" aria-label="Quick actions">
          {quick.map(([id, I, label], n) => <button key={id} className={`btn ${n === 0 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(id)}><I size={15} /> {label}</button>)}
        </div>
      </header>

      <Onboarding jobs={jobs} setPage={setPage} />

      <KpiGrid>
        <KpiCard icon={Scissors} label="Pattern jobs · 30 days" value={last30} tone="brand" spark={spark} delta={<Delta now={last30} prev={prev30} suffix="vs prior 30 days" />} />
        <KpiCard icon={CheckCircle2} label="Success rate" display={decided ? `${Math.round((done / decided) * 100)}%` : '—'} ring={decided ? (done / decided) * 100 : null} sub={decided ? `${done} completed · ${failed} failed` : `${jobs.length} job${jobs.length === 1 ? '' : 's'} so far`} tone="success" />
        <KpiCard icon={ImageIcon} label="Images processed" value={u.used} ring={pct} sub={`of ${u.limit.toLocaleString()} this month · ${Math.round(pct)}% used`} tone={pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'info'} />
        <KpiCard icon={Wallet} label="Plan" display={PLAN.name} sub={`${money(PLAN.price)} per month`} tone="warn" />
      </KpiGrid>

      <div className="wp-split">
        <Panel title="Pattern activity" sub={`${total.toLocaleString()} ${total === 1 ? 'job' : 'jobs'} in the last ${days} days`} action={<Segmented small label="Time range" options={RANGES} value={days} onChange={setDays} />}>
          <LineChart key={days} data={series} unit="jobs" />
        </Panel>
        <Panel title="Jobs by garment" sub="All time · top types">
          {byGarment.length ? <HBars items={byGarment.map(([label, value]) => ({ label, value }))} /> : <ProEmpty icon={BarChart3} title="No data yet" body="Garment types show up here once you run a job." />}
        </Panel>
      </div>

      <div className="wp-triple">
        <Panel title="Recent projects" action={<button className="link" onClick={() => setPage('projects')}>View all</button>}>
          {jobs.length ? (
            <ul className="wp-feed big">
              {jobs.slice(0, 5).map((j, i) => (
                <li key={j.id || j.job_id || i}><span className="wp-feed-icon"><Scissors size={16} /></span><div><strong>{jobTitle(j)}</strong><small>{fmtDate(j.createdAt) || 'Just now'}</small></div><StatusPill status={j.status} /></li>
              ))}
            </ul>
          ) : <ProEmpty icon={FolderKanban} title="No projects yet" body="Upload a garment photo in Pattern Studio to create your first one." action="Open Pattern Studio" onAction={() => setPage('studio')} />}
        </Panel>

        <Panel title="Workspace pipeline" sub="Products across your company" action={<button className="link" onClick={() => setPage('fashion-command')}>Command Center</button>}>
          {dash ? (
            <>
              <HBars items={[['Products', dash.products], ['Processing', dash.processing], ['In review', dash.review], ['Approved', dash.approved]].map(([label, v]) => ({ label, value: Number(v) || 0 }))} />
              <div className="wp-inline-stat"><Ring value={Number(dash.readiness) || 0} size={48} tone="info" label={`${Number(dash.readiness) || 0}%`} /><div><strong>Average readiness</strong><small>Completeness across all products</small></div></div>
            </>
          ) : <ProEmpty icon={Sparkles} title={dash === undefined ? 'Loading pipeline…' : 'Pipeline unavailable'} body={dash === undefined ? 'Fetching your workspace metrics.' : 'Open the Command Center to see production status.'} />}
        </Panel>

        <Panel title="Monthly image allowance" sub="Resets at the start of your next billing period">
          <div className="wp-allow">
            <Ring value={pct} size={96} stroke={9} tone={pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : 'info'} label={`${Math.round(pct)}%`} />
            <div><strong>{u.used.toLocaleString()}<span> / {u.limit.toLocaleString()}</span></strong><small>images processed</small></div>
          </div>
          <Meter used={u.used} limit={u.limit} />
          <p className="wp-note">{u.over > 0 ? `${u.over.toLocaleString()} over your included images. Overage is billed automatically; requests are never blocked.` : `${Math.max(0, u.limit - u.used).toLocaleString()} images left this period.`}</p>
          <div className="wp-panel-links"><button className="btn btn-ghost" onClick={() => setPage('usage')}>Usage details <ArrowRight size={15} /></button><button className="btn btn-ghost" onClick={() => setPage('keys')}><KeyRound size={15} /> API keys</button></div>
        </Panel>
      </div>
    </div>
  );
}
