import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Segmented } from '../components/ui.jsx';
import EmptyPage from './EmptyPage.jsx';
import { LineChart, BarChart } from '../components/Charts.jsx';
import { dailySeries, tally, cap } from '../usage.js';

const RANGES = [{ value: 30, label: '30D' }, { value: 90, label: '90D' }];

export default function Analytics({ jobs }) {
  const [days, setDays] = useState(90);
  const series = useMemo(() => dailySeries(jobs, days), [jobs, days]);
  const byGarment = useMemo(() => tally(jobs, (j) => cap(String(j.garment || 'Other').replace(/-/g, ' '))), [jobs]);
  const byStatus = useMemo(() => tally(jobs, (j) => cap(j.status || 'processing')), [jobs]);

  if (!jobs.length) {
    return <EmptyPage type="analytics" eyebrow="ANALYTICS" title="Your workspace story starts here" body="Run a few pattern or capture jobs and FabricNow will turn real activity into production trends. No sample metrics are shown." />;
  }
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h3>Jobs over time</h3><Segmented small label="Time range" options={RANGES} value={days} onChange={setDays} /></div>
        <LineChart key={days} data={series} unit="jobs" height={300} />
      </section>
      <div className="cols grid-2">
        <section className="panel"><div className="panel-head"><h3>By garment type</h3></div><BarChart data={byGarment} /></section>
        <section className="panel"><div className="panel-head"><h3>By status</h3></div><BarChart data={byStatus} /></section>
      </div>
    </>
  );
}
