import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { AuthHashCleanup } from './components/AuthHashCleanup';
import { redirectOffLocalhostAfterOAuth } from './lib/productionRedirect';
import './styles/tokens.css';

redirectOffLocalhostAfterOAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AuthHashCleanup />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
