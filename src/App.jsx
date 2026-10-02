import React, { useEffect, useState } from 'react';
import { api, TOKEN_KEY } from './api.js';
import { getUsage, isRunning } from './usage.js';
import { Sidebar, Topbar } from './components/Shell.jsx';
import { LogoMark } from './components/Logo.jsx';
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
import { Company, SettingsPage, Help } from './pages/Account.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [page, setPage] = useState('overview');
  const [menu, setMenu] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    api('/api/auth/me').then((d) => setUser(d.user)).catch(() => localStorage.removeItem(TOKEN_KEY)).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([api('/api/billing/api-status'), api('/api/workspace/jobs')]).then(([a, j]) => {
      if (a.status === 'fulfilled') setApiStatus(a.value);
      if (j.status === 'fulfilled') setJobs(j.value.jobs || []);
    });
  }, [user]);

  // keep the project list fresh while anything is still running (also picks up jobs started in another tab)
  const anyRunning = jobs.some(isRunning);
  useEffect(() => {
    if (!user || !anyRunning) return undefined;
    const id = setInterval(() => {
      api('/api/workspace/jobs').then((d) => setJobs((cur) => {
        const fresh = new Map((d.jobs || []).map((j) => [j.id, j]));
        return [...(d.jobs || []), ...cur.filter((j) => !fresh.has(j.id))].sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
      })).catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [user, anyRunning]);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  if (checking) return <div className="splash"><LogoMark size={44} /></div>;
  if (!user) return <Login onAuth={setUser} />;

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); setJobs([]); setApiStatus(null); setPage('overview'); };
  const usage = getUsage(apiStatus);
  const addJob = (job) => setJobs((js) => [job, ...js.filter((j) => j.id !== job.id)]);
  const updateJob = (job) => setJobs((js) => (js.some((j) => j.id === job.id) ? js.map((j) => (j.id === job.id ? { ...j, ...job } : j)) : [job, ...js]));
  const removeJob = (id) => setJobs((js) => js.filter((j) => j.id !== id));

  const view = {
    overview: <Overview user={user} apiStatus={apiStatus} jobs={jobs} setPage={setPage} />,
    studio: <Studio onDone={addJob} onJob={updateJob} onDeleted={removeJob} setPage={setPage} />,
    lab: <Lab onDone={addJob} onJob={updateJob} onDeleted={removeJob} setPage={setPage} />,
    projects: <Projects jobs={jobs} setPage={setPage} onJob={updateJob} onDeleted={removeJob} />,
    analytics: <Analytics jobs={jobs} />,
    keys: <ApiKeys />,
    usage: <Usage apiStatus={apiStatus} setPage={setPage} />,
    billing: <Billing apiStatus={apiStatus} />,
    company: <Company user={user} />,
    settings: <SettingsPage user={user} />,
    help: <Help />,
  }[page];

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} open={menu} close={() => setMenu(false)} user={user} usage={usage} />
      <div className="main">
        <Topbar page={page} setPage={setPage} openMenu={() => setMenu(true)} user={user} onLogout={logout} />
        <main className="content"><div className="page" key={page}><ErrorBoundary resetKey={page}>{view}</ErrorBoundary></div></main>
      </div>
    </div>
  );
}
