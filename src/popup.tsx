import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './components/PopupApp';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
} else {
  console.error('Root element not found');
}