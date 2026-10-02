import React from 'react';
import { Braces, FileSpreadsheet, Webhook, Code2 } from 'lucide-react';

/* Brand marks for the integrations list. Colours follow each brand's public palette. */

export function ShopifyLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Shopify" className="brand-svg">
      <path d="M12.2 11.4c.1-.5.5-.8 1-.8l23.2-.2c.5 0 .9.4 1 .9l3.2 25.4c.1.6-.3 1.1-.9 1.2l-27 3.2c-.6.1-1.1-.3-1.2-.9L9.2 13.9c0-.2 0-.4.1-.6l2.9-1.9z" fill="#95BF47" />
      <path d="M17.3 17.2h19.9l1.6 21.4-23.4 2.8-1.2-15.2 3.1-9z" fill="#5E8E3E" opacity=".35" />
      <path d="M17 17.4c0-4.4 2.9-7.9 7-7.9s7 3.5 7 7.9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M26.4 22.3c-.9-.5-2-.7-3-.6-1.9.1-2.6 1.1-2.5 2.2.1 1.2 1.4 1.8 2.8 2.4 1.9.8 3.6 1.7 3.5 3.8-.1 2.3-1.8 3.7-4.1 3.8-1.4.1-2.8-.3-3.9-1" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WooCommerceLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="WooCommerce" className="brand-svg">
      <path d="M8 9h32a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H29l3.4 7L21 33H8a5 5 0 0 1-5-5V14a5 5 0 0 1 5-5z" fill="#7F54B3" />
      <text x="24" y="26.4" textAnchor="middle" fontFamily="Arial Black,Arial,Helvetica,sans-serif" fontWeight="900" fontSize="12.5" fill="#fff" letterSpacing="-.3">Woo</text>
    </svg>
  );
}

function Glyph({ icon: Icon, tint }) {
  return <span className="brand-glyph" style={{ '--tint': tint }}><Icon size={22} strokeWidth={2} /></span>;
}

export const INTEGRATIONS = [
  { id: 'shopify', name: 'Shopify', note: 'Product + image sync', logo: <ShopifyLogo /> },
  { id: 'woocommerce', name: 'WooCommerce', note: 'Product + image sync', logo: <WooCommerceLogo /> },
  { id: 'api', name: 'Custom API', note: 'REST, key-based', logo: <Glyph icon={Code2} tint="#302C4D" /> },
  { id: 'csv', name: 'CSV feed', note: 'Any store or marketplace', logo: <Glyph icon={FileSpreadsheet} tint="#17794A" /> },
  { id: 'json', name: 'JSON API', note: 'Structured product data', logo: <Glyph icon={Braces} tint="#C44A1D" /> },
  { id: 'webhooks', name: 'Webhooks', note: 'Push events to your app', logo: <Glyph icon={Webhook} tint="#657E92" /> },
];
