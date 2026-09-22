import './utils/pristineApis.js';
import './i18n';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import DefensiveErrorBoundary from './components/common/DefensiveErrorBoundary.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DefensiveErrorBoundary>
      <App />
    </DefensiveErrorBoundary>
  </StrictMode>
);
