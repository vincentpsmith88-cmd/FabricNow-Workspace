import React, { useEffect, useState } from 'react';
import { api, TOKEN_KEY } from './api.js';
import { getUsage } from './usage.js';
import { Sidebar, Topbar } from './components/Shell.jsx';
import { LogoMark } from './components/Logo.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Studio from './pages/Studio.jsx';
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
      if (j.status === 'fulfilled') setJobs(Array.isArray(j.value) ? j.value : (j.value.jobs || []));
    });
  }, [user]);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  useEffect(() => {
    if (!user || !jobs.some(j => ['queued','processing'].includes(j.status))) return undefined;
    const id = setInterval(() => {
      api('/api/workspace/jobs').then(d => setJobs(Array.isArray(d) ? d : (d.jobs || []))).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [user, jobs]);

  if (checking) return <div className="splash"><LogoMark size={44} /></div>;
  if (!user) return <Login onAuth={setUser} />;

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); setJobs([]); setApiStatus(null); setPage('overview'); };
  const usage = getUsage(apiStatus);
  const addJob = (job) => setJobs((js) => [job, ...js]);

  const view = {
    overview: <Overview user={user} apiStatus={apiStatus} jobs={jobs} setPage={setPage} />,
    studio: <Studio onDone={addJob} setPage={setPage} />,
    projects: <Projects jobs={jobs} setPage={setPage} />,
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
