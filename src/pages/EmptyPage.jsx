import React from 'react';
import { ArrowUpRight, BarChart3, CreditCard, Building2, Settings, HelpCircle, Activity, KeyRound } from 'lucide-react';

const ICONS={analytics:BarChart3,usage:Activity,billing:CreditCard,company:Building2,settings:Settings,help:HelpCircle,keys:KeyRound};
export default function EmptyPage({type='analytics',eyebrow='WORKSPACE',title='Nothing here yet',body='This area will fill with live workspace data when the backend has something to show.',action,children}){
 const Icon=ICONS[type]||Activity;
 return <div className="product-empty-page">
  <div className="product-empty-shell">
   <div className="product-empty-art"><div className="product-empty-orb"><Icon size={30}/></div><span/><span/><span/></div>
   <div className="product-empty-copy"><div className="library-empty-label">{eyebrow}</div><h2>{title}</h2><p>{body}</p>{action && <div className="library-empty-actions">{action}</div>}</div>
  </div>
  {children}
 </div>
}
export function ExternalAction({href,children}){return <a className="btn btn-ghost" href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={14}/></a>}
