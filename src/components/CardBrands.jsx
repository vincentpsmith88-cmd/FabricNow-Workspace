import React, { useId } from 'react';
import { CreditCard } from 'lucide-react';

/* Card-network marks. `tone="light"` is for use on the dark card face, `tone="color"` for white surfaces. */

export const normalizeBrand = (b) => {
  const k = String(b || '').toLowerCase().replace(/[\s-]/g, '_');
  const map = { american_express: 'amex', diners_club: 'diners', union_pay: 'unionpay', master_card: 'mastercard' };
  return map[k] || k || 'unknown';
};

export const BRAND_NAMES = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover',
  diners: 'Diners Club', jcb: 'JCB', unionpay: 'UnionPay', unknown: 'Card',
};
export const brandName = (b) => BRAND_NAMES[normalizeBrand(b)] || 'Card';

function Mastercard({ height }) {
  const id = useId();
  return (
    <svg height={height} viewBox="0 0 64 40" role="img" aria-label="Mastercard">
      <defs><clipPath id={id}><circle cx="24" cy="20" r="14" /></clipPath></defs>
      <circle cx="24" cy="20" r="14" fill="#EB001B" />
      <circle cx="40" cy="20" r="14" fill="#F79E1B" />
      <circle cx="40" cy="20" r="14" fill="#FF5F00" clipPath={`url(#${id})`} />
    </svg>
  );
}

function Visa({ height, tone }) {
  return (
    <svg height={height} viewBox="0 0 64 40" role="img" aria-label="Visa">
      <text x="32" y="28" textAnchor="middle" fontFamily="'Arial Black',Arial,Helvetica,sans-serif" fontWeight="900" fontStyle="italic" fontSize="22" letterSpacing="-1" fill={tone === 'light' ? '#fff' : '#1A1F71'}>VISA</text>
    </svg>
  );
}

function Amex({ height }) {
  return (
    <svg height={height} viewBox="0 0 64 40" role="img" aria-label="American Express">
      <rect x="6" y="6" width="52" height="28" rx="6" fill="#2E77BC" />
      <text x="32" y="25" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontWeight="800" fontSize="12" letterSpacing=".5" fill="#fff">AMEX</text>
    </svg>
  );
}

function Discover({ height, tone }) {
  return (
    <svg height={height} viewBox="0 0 64 40" role="img" aria-label="Discover">
      <text x="30" y="24" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontWeight="800" fontSize="9.5" fill={tone === 'light' ? '#fff' : '#1D1A33'}>DISCOVER</text>
      <circle cx="54" cy="20" r="5" fill="#F58220" />
    </svg>
  );
}

function Wordmark({ height, label, tone }) {
  return (
    <svg height={height} viewBox="0 0 64 40" role="img" aria-label={label}>
      <text x="32" y="25" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontWeight="800" fontSize="11" fill={tone === 'light' ? '#fff' : '#302C4D'}>{label}</text>
    </svg>
  );
}

export default function BrandLogo({ brand, tone = 'color', height = 28 }) {
  switch (normalizeBrand(brand)) {
    case 'visa': return <Visa height={height} tone={tone} />;
    case 'mastercard': return <Mastercard height={height} />;
    case 'amex': return <Amex height={height} />;
    case 'discover': return <Discover height={height} tone={tone} />;
    case 'jcb': return <Wordmark height={height} label="JCB" tone={tone} />;
    case 'diners': return <Wordmark height={height} label="DINERS" tone={tone} />;
    case 'unionpay': return <Wordmark height={height} label="UnionPay" tone={tone} />;
    default: return <CreditCard size={height * 0.8} color={tone === 'light' ? 'rgba(255,255,255,.75)' : 'currentColor'} strokeWidth={1.6} />;
  }
}
