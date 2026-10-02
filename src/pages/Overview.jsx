import React, { useMemo, useState } from 'react';
import { Scissors, ArrowRight, FolderKanban, BarChart3 } from 'lucide-react';
import { PLAN, money } from '../api.js';
import { getUsage, isDone, fmtDate, dailySeries, tally, cap, jobTitle } from '../usage.js';
import { StatusPill, Empty, Meter, Segmented } from '../components/ui.jsx';
import { LineChart, BarChart, CountUp } from '../components/Charts.jsx';
import Onboarding from '../components/Onboarding.jsx';

const RANGES = [{ value: 7, label: '7D' }, { value: 30, label: '30D' }, { value: 90, label: '90D' }];

export default function Overview({ user, apiStatus, jobs, setPage }) {
  const [days, setDays] = useState(30);
  const u = getUsage(apiStatus);
  const first = (user.name || '').split(' ')[0];
  const done = jobs.filter(isDone).length;
  const series = useMemo(() => dailySeries(jobs, days), [jobs, days]);
  const total = series.reduce((a, b) => a + b.value, 0);
  const byGarment = useMemo(() => tally(jobs, (j) => cap(String(j.garment || 'Other').replace(/-/g, ' '))), [jobs]);

  return (
    <>
      <div className="greeting">
        <h2>{first ? `Good to see you, ${first}.` : 'Good to see you.'}</h2>
        <p>Generate garment pattern assets and keep an eye on your API allowance.</p>
      </div>

      <Onboarding jobs={jobs} setPage={setPage} />

      <div className="stat-strip">
        <div><span>Pattern jobs</span><strong><CountUp value={jobs.length} /></strong><small>Run in this workspace</small></div>
        <div><span>Completed</span><strong><CountUp value={done} /></strong><small>Ready to export</small></div>
        <div><span>Images processed</span><strong><CountUp value={u.used} /></strong><small>of {u.limit.toLocaleString()} this month</small></div>
        <div><span>Plan</span><strong className="stat-text">{PLAN.name}</strong><small>{money(PLAN.price)} per month</small></div>
      </div>

      <div className="cols grid-chart">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h3>Pattern activity</h3>
              <p className="muted small-text">{total.toLocaleString()} {total === 1 ? 'job' : 'jobs'} in the last {days} days</p>
            </div>
            <Segmented small label="Time range" options={RANGES} value={days} onChange={setDays} />
          </div>
          <LineChart key={days} data={series} unit="jobs" />
        </section>

        <section className="panel">
          <div className="panel-head"><div><h3>Jobs by garment</h3><p className="muted small-text">All time</p></div></div>
          {byGarment.length ? <BarChart data={byGarment} /> : (
            <Empty icon={BarChart3} title="No data yet" body="Garment types show up here once you run a job." />
          )}
        </section>
      </div>

      <div className="cols grid-2">
        <section className="panel">
          <div className="panel-head">
            <h3>Recent projects</h3>
            <button className="link" onClick={() => setPage('projects')}>View all</button>
          </div>
          {jobs.length ? (
            <ul className="rows">
              {jobs.slice(0, 5).map((j, i) => (
                <li key={j.id || j.job_id || i}>
                  <span className="row-icon"><Scissors size={16} /></span>
                  <div><strong>{jobTitle(j)}</strong><small>{fmtDate(j.createdAt) || 'Just now'}</small></div>
                  <StatusPill status={j.status} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              icon={FolderKanban}
              title="No projects yet"
              body="Upload a garment photo in Pattern Studio to create your first one."
              action={<button className="btn btn-primary" onClick={() => setPage('studio')}>Open Pattern Studio</button>}
            />
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h3>Monthly image allowance</h3></div>
          <div className="big-num"><CountUp value={u.used} /><span> / {u.limit.toLocaleString()}</span></div>
          <Meter used={u.used} limit={u.limit} />
          <p className="muted small-text">
            {u.over > 0
              ? `${u.over.toLocaleString()} over your included images. Overage is billed automatically; requests are never blocked.`
              : `${Math.max(0, u.limit - u.used).toLocaleString()} images left. Usage resets at the start of your next billing period.`}
          </p>
          <button className="btn btn-ghost" onClick={() => setPage('usage')}>See usage details <ArrowRight size={16} /></button>
        </section>
      </div>
    </>
  );
}
