import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Empty, Segmented } from '../components/ui.jsx';
import { LineChart, BarChart } from '../components/Charts.jsx';
import { dailySeries, tally, cap } from '../usage.js';

const RANGES = [{ value: 30, label: '30D' }, { value: 90, label: '90D' }];

export default function Analytics({ jobs }) {
  const [days, setDays] = useState(90);
  const series = useMemo(() => dailySeries(jobs, days), [jobs, days]);
  const byGarment = useMemo(() => tally(jobs, (j) => cap(j.garment || 'Other')), [jobs]);
  const byStatus = useMemo(() => tally(jobs, (j) => cap(j.status || 'processing')), [jobs]);

  if (!jobs.length) {
    return <section className="panel"><Empty icon={BarChart3} title="Nothing to chart yet" body="Run a few pattern jobs and your trends show up here." /></section>;
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
