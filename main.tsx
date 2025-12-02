import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './src/App';
const DashboardWrapper = React.lazy(() => import('./src/components/DashboardWrapper'));
const NotFoundScreen = React.lazy(() => import('./src/pages/NotFoundScreen')); // Importar NotFoundScreen
import { VALID_PRODUCT_SLUGS } from './src/constants/productConfig'; // Importar slugs válidos

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<React.Suspense fallback={<div>Carregando...</div>}><DashboardWrapper /></React.Suspense>} />
        {VALID_PRODUCT_SLUGS.map(slug => (
          <Route key={slug} path={`/${slug}`} element={<App />} />
        ))}
        {/* Adicionando uma rota com parâmetro nomeado para capturar o slug */}
        <Route path="/:productSlug" element={<App />} />
        <Route path="*" element={<React.Suspense fallback={<div>Carregando...</div>}><NotFoundScreen /></React.Suspense>} /> {/* Rota curinga para qualquer outro slug */}
      </Routes>
    </BrowserRouter>
);