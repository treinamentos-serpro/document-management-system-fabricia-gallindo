import { useRef, useState } from 'react';

export default function UploadForm({ onUpload, disabled }) {
  const [file, setFile] = useState(null);
  const formRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    const uploaded = await onUpload(file);
    if (!uploaded) return;
    setFile(null);
    formRef.current?.reset();
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor="document-file">Selecione um documento</label>
      <div className="upload-controls">
        <input
          id="document-file"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={disabled}
          required
        />
        <button type="submit" disabled={disabled || !file}>
          {disabled ? 'Enviando...' : 'Enviar documento'}
        </button>
      </div>
      <p className="hint">Limite: 10 MiB por arquivo.</p>
    </form>
  );
}
