import React from 'react';
import { FolderKanban } from 'lucide-react';
import { fmtDate } from '../usage.js';
import { StatusPill, Empty } from '../components/ui.jsx';

export default function Projects({ jobs, setPage }) {
  if (!jobs.length) {
    return (
      <section className="panel">
        <Empty icon={FolderKanban} title="No projects yet" body="Pattern jobs you run appear here with their status."
          action={<button className="btn btn-primary" onClick={() => setPage('studio')}>Open Pattern Studio</button>} />
      </section>
    );
  }
  return (
    <section className="panel flush">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Garment</th><th>Job ID</th><th>Created</th><th>Status</th></tr></thead>
          <tbody>
            {jobs.map((j, i) => (
              <tr key={j.id || j.job_id || i}>
                <td><strong>{j.garment || 'Pattern job'}</strong></td>
                <td><code>{j.id || j.job_id || '-'}</code></td>
                <td>{fmtDate(j.createdAt) || '-'}</td>
                <td><StatusPill status={j.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
