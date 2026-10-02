import React, { useState } from 'react';
import { FolderKanban } from 'lucide-react';
import { fmtDate, jobTitle, KIND_LABEL } from '../usage.js';
import { StatusPill, Empty } from '../components/ui.jsx';
import JobView from '../components/JobView.jsx';

export default function Projects({ jobs, setPage, onJob, onDeleted }) {
  const [open, setOpen] = useState(null);
  if (!jobs.length) {
    return (
      <section className="panel">
        <Empty icon={FolderKanban} title="No projects yet" body="Pattern jobs and AI tool runs appear here with their status and downloads."
          action={<button className="btn btn-primary" onClick={() => setPage('studio')}>Open Pattern Studio</button>} />
      </section>
    );
  }
  const current = jobs.find((j) => j.id === open);
  return (
    <div className="stack">
      <section className="panel flush">
        <div className="table-wrap">
          <table className="clickable">
            <thead><tr><th>Project</th><th>Type</th><th>Job ID</th><th>Created</th><th>Status</th></tr></thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={j.id || i} tabIndex={0} className={open === j.id ? 'sel' : ''} onClick={() => setOpen(j.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setOpen(j.id); }}>
                  <td><strong>{jobTitle(j)}</strong></td>
                  <td>{KIND_LABEL[j.kind || 'pattern'] || j.kind}</td>
                  <td><code>{(j.id || '').slice(0, 8)}</code></td>
                  <td>{fmtDate(j.createdAt) || '-'}</td>
                  <td><StatusPill status={j.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {current && <JobView key={current.id} jobId={current.id} initial={current} onJob={onJob} onDeleted={(id) => { setOpen(null); onDeleted(id); }} />}
    </div>
  );
}
