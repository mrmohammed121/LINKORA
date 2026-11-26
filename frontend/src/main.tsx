import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';

const googleClientId = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '405092491316-8na3nk7ci8e654qg0mjaafcro05i8f5f.apps.googleusercontent.com'
).trim();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>
);
