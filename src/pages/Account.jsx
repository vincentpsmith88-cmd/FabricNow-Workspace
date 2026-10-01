import React from 'react';
import { ExternalLink } from 'lucide-react';
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
  return (
    <section className="panel">
      <div className="panel-head"><h3>Your profile</h3></div>
      <dl className="kv">
        <div><dt>Name</dt><dd>{user.name}</dd></div>
        <div><dt>Email</dt><dd>{user.email}</dd></div>
      </dl>
    </section>
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
