import React from 'react';

/** Button that keeps its label and shows the app's spinner while `busy` (same look as pendingButtons.js). */
export default function PendingButton({ busy = false, icon: Icon, className = 'btn btn-primary', children, ...props }) {
  return (
    <button {...props} className={`${className} ${busy ? 'is-pending' : ''}`} aria-busy={busy || undefined} data-no-spin>
      {!busy && Icon && <Icon size={16} />}{children}
    </button>
  );
}
