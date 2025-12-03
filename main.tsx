import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import App from './src/App';
const DashboardWrapper = React.lazy(() => import('./src/components/DashboardWrapper'));
const NotFoundScreen = React.lazy(() => import('./src/pages/NotFoundScreen')); // Importar NotFoundScreen
const PoliticasPrivacidade = React.lazy(() => import('./src/pages/PoliticasPrivacidade'));
const TermosDeUso = React.lazy(() => import('./src/pages/TermosDeUso'));
import { VALID_PRODUCT_SLUGS } from './src/constants/productConfig'; // Importar slugs válidos

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Componente de Error Boundary simples para o nível da rota
class RouteErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Route Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-600 bg-red-50 min-h-screen flex flex-col items-center justify-center">
          <h1 className="text-xl font-bold mb-2">Algo deu errado ao carregar esta página.</h1>
          <pre className="text-sm bg-white p-4 rounded border border-red-200 max-w-full overflow-auto">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={
        <RouteErrorBoundary>
          <React.Suspense fallback={<div>Carregando...</div>}>
            <DashboardWrapper />
          </React.Suspense>
        </RouteErrorBoundary>
      } />
      <Route path="/politicas-privacidade" element={<React.Suspense fallback={<div>Carregando...</div>}><PoliticasPrivacidade /></React.Suspense>} />
      <Route path="/termos-de-uso" element={<React.Suspense fallback={<div>Carregando...</div>}><TermosDeUso /></React.Suspense>} />
      {VALID_PRODUCT_SLUGS.map(slug => (
        <Route key={slug} path={`/${slug}`} element={<App />} />
      ))}

      <Route path="*" element={<React.Suspense fallback={<div>Carregando...</div>}><NotFoundScreen /></React.Suspense>} /> {/* Rota curinga para qualquer outro slug */}
    </Routes>
  </BrowserRouter>
);