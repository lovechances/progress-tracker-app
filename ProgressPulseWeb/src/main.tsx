import React from 'react';
import ReactDOM from 'react-dom/client';
import { ProgressProvider } from './context/ProgressContext';
import { ProgressPulseApp } from './App';
import { registerSW } from 'virtual:pwa-register';
import './styles.css';

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ProgressProvider>
      <ProgressPulseApp />
    </ProgressProvider>
  </React.StrictMode>
);
