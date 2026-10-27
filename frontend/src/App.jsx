import DocumentsPage from './pages/DocumentsPage.jsx';
import './styles.css';

export default function App() {
  return (
    <main className="page-shell">
      <DocumentsPage />
      <p className="demo-notice">
        Demonstração: usuário demo-user, informado pelo cliente via X-User-Id.
        Não há autenticação; esse identificador pode ser falsificado.
      </p>
    </main>
  );
}
