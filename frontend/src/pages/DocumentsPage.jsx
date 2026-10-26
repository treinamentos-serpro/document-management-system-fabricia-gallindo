import { useCallback, useEffect, useState } from 'react';
import DocumentList from '../components/DocumentList.jsx';
import UploadForm from '../components/UploadForm.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from '../services/documentsApi.js';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listFailed, setListFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshDocuments = useCallback(async () => {
    const result = await listDocuments();
    setDocuments(result);
    setListFailed(false);
  }, []);

  useEffect(() => {
    let active = true;

    listDocuments()
      .then((result) => {
        if (active) setDocuments(result);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.message);
          setListFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleUpload(file) {
    setUploading(true);
    setError('');
    setNotice('');

    try {
      await uploadDocument(file);
      await refreshDocuments();
      setNotice('Documento enviado com sucesso.');
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setError('');

    try {
      await downloadDocument(document.id, document.originalName);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div className="brand-mark" aria-hidden="true">D</div>
        <div>
          <p className="eyebrow">DOCUMENTOS</p>
          <h1>Meus documentos</h1>
          <p className="subtitle">
            Envie, organize e baixe seus arquivos em um só lugar.
          </p>
        </div>
      </header>

      <section className="panel upload-panel" aria-labelledby="upload-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NOVO ARQUIVO</p>
            <h2 id="upload-title">Enviar documento</h2>
          </div>
        </div>
        <UploadForm onUpload={handleUpload} disabled={uploading} />
      </section>

      {error && <p className="feedback error" role="alert">{error}</p>}
      {notice && <p className="feedback success" role="status">{notice}</p>}

      <section className="panel" aria-labelledby="documents-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">SUA BIBLIOTECA</p>
            <h2 id="documents-title">Documentos enviados</h2>
          </div>
          <span className="count-badge">{documents.length}</span>
        </div>
        {loading ? (
          <p className="empty-state">Carregando documentos...</p>
        ) : listFailed ? (
          <p className="empty-state">Não foi possível carregar a lista de documentos.</p>
        ) : (
          <DocumentList
            documents={documents}
            onDownload={handleDownload}
            downloadingId={downloadingId}
          />
        )}
      </section>

      <p className="demo-notice">
        Demonstração: os documentos são associados a um usuário de exemplo.
      </p>
    </main>
  );
}
