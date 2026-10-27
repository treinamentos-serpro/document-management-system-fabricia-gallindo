import { useId, useRef, useState } from 'react';

export default function UploadComponent({ onUpload, disabled = false }) {
  const [file, setFile] = useState(null);
  const formRef = useRef(null);
  const inputId = useId();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || disabled) return;

    const uploaded = await onUpload(file);
    if (!uploaded) return;
    setFile(null);
    formRef.current?.reset();
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit} ref={formRef} aria-busy={disabled}>
      <label htmlFor={inputId}>Selecione um documento</label>
      <div className="upload-controls">
        <input
          id={inputId}
          name="file"
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          disabled={disabled}
          required
        />
        <button type="submit" disabled={disabled || !file}>
          {disabled ? 'Enviando...' : 'Enviar documento'}
        </button>
      </div>
      <p className="hint">Um arquivo por envio. O limite de tamanho é definido pelo servidor.</p>
    </form>
  );
}
