import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from '@/lib/i18n';
import { DataProvider } from '@/store/DataContext';
import App from '@/App';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
