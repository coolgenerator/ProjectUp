// import { StrictMode } from 'react'
import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import store, { persistor } from "./store/store";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from 'redux-persist/lib/integration/react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/i18n';

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense fallback="Loading translations...">
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nextProvider>
      </Suspense>
    </PersistGate>
  </Provider>,
)
