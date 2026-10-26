import DownloadButton from './DownloadButton.jsx';

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, onDownload }) {
  if (documents.length === 0) {
    return <p className="empty-state">Nenhum documento enviado ainda.</p>;
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-item" key={document.id}>
          <div className="document-details">
            <strong title={document.originalName}>{document.originalName}</strong>
            <span>
              {formatSize(document.size)} · {formatDate(document.uploadedAt)}
            </span>
          </div>
          <DownloadButton document={document} onDownload={onDownload} />
        </li>
      ))}
    </ul>
  );
}
