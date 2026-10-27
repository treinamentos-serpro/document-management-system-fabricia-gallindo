import { useRef, useState } from 'react';

export default function DownloadButton({ document, onDownload }) {
  const [downloading, setDownloading] = useState(false);
  const pending = useRef(false);

  async function handleClick() {
    if (pending.current) return;
    pending.current = true;
    setDownloading(true);
    try {
      await onDownload(document);
    } finally {
      pending.current = false;
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      className="secondary-button"
      onClick={handleClick}
      disabled={downloading}
      aria-busy={downloading}
      aria-label={`Baixar ${document.originalName}`}
    >
      {downloading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}
