import React from 'react';

export function LogoMark({ size = 28 }) {
  return <img src="/logo-icon.svg" alt="" width={size} height={Math.round(size * 1.08)} className="logo-mark" />;
}

export function Brand({ light = false, size = 28 }) {
  return (
    <div className={`brand ${light ? 'brand-light' : ''}`}>
      <LogoMark size={size} />
      <span>FABRICNOW</span>
    </div>
  );
}
