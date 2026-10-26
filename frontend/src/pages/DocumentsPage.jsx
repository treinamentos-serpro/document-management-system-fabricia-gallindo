import { useCallback, useEffect, useRef, useState } from 'react';
import DocumentList from '../components/DocumentList.jsx';
import UploadComponent from '../components/UploadComponent.jsx';
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
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const listRequest = useRef(null);

  const refreshDocuments = useCallback(async () => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    setLoading(true);
    try {
      const result = await listDocuments({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setDocuments(result);
      setListFailed(false);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setListFailed(true);
      throw requestError;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDocuments().catch((requestError) => setError(requestError.message));

    return () => {
      listRequest.current?.abort();
    };
  }, [refreshDocuments]);

  async function handleUpload(file) {
    setUploading(true);
    setError('');
    setNotice('');

    try {
      await uploadDocument(file);
      setNotice('Documento enviado com sucesso.');
      try {
        await refreshDocuments();
      } catch (requestError) {
        setError(`O documento foi enviado, mas a lista não foi atualizada: ${requestError.message}`);
      }
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(document) {
    setError('');
    setNotice('');

    try {
      await downloadDocument(document.id, document.originalName);
      setNotice('Download iniciado.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <>
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
        <UploadComponent onUpload={handleUpload} disabled={uploading} />
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
          />
        )}
      </section>

    </>
  );
}
