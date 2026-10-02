import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './toast.jsx';
import './styles.css';
import './modern.css';
import { installPendingButtons } from './pendingButtons.js';
import { applyTheme, getTheme } from './theme.js';

installPendingButtons();
applyTheme(getTheme());

createRoot(document.getElementById('root')).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
