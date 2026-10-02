import React from 'react';
import { ExternalLink, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme.js';
import { PLAN, money } from '../api.js';
import { companyName } from '../usage.js';

const SITE = 'https://fabricnow.tonasel.com';

export function Company({ user }) {
  return (
    <section className="panel">
      <div className="panel-head"><h3>Workspace</h3></div>
      <dl className="kv">
        <div><dt>Company</dt><dd>{companyName(user) || 'Not set'}</dd></div>
        <div><dt>Owner</dt><dd>{user.name}</dd></div>
        <div><dt>Plan</dt><dd>{PLAN.name}, {money(PLAN.price)}/mo</dd></div>
      </dl>
      {!companyName(user) && <p className="muted small-text">No company name is on file yet. <a className="link" href="https://fabricnow.tonasel.com/contact" target="_blank" rel="noreferrer">Contact FabricNow</a> to add it.</p>}
    </section>
  );
}

export function SettingsPage({ user }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <div className="settings-stack">
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
    ['API for Developers', 'Endpoints, tiers and overage rates', `${SITE}/developers`],
    ['Help Center', 'Answers to common questions', `${SITE}/help`],
    ['Download & Licensing', 'What you can do with each file', `${SITE}/licensing`],
    ['Contact us', 'Talk to the FabricNow team', `${SITE}/contact`],
  ];
  return (
    <section className="panel">
      <ul className="rows link-rows">
        {links.map(([t, d, href]) => (
          <li key={t}>
            <div><strong>{t}</strong><small>{d}</small></div>
            <a className="btn btn-ghost" href={href} target="_blank" rel="noreferrer">Open <ExternalLink size={14} /></a>
          </li>
        ))}
      </ul>
    </section>
  );
}
