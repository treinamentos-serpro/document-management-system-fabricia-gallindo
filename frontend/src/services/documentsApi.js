const USER_ID = 'demo-user';

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'X-User-Id': USER_ID,
    },
  });

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new Error(`Não foi possível concluir a operação (HTTP ${response.status}).`);
    }
    throw new Error(payload?.error?.message || 'Não foi possível concluir a operação.');
  }

  return response;
}

export async function listDocuments({ signal } = {}) {
  const response = await request('/api/documents', { signal });
  const payload = await response.json();
  return payload.documents;
}

export async function uploadDocument(file) {
  const data = new FormData();
  data.append('file', file);

  const response = await request('/api/upload', {
    method: 'POST',
    body: data,
  });
  const payload = await response.json();
  return payload.document;
}

export async function downloadDocument(id, originalName) {
  const response = await request(`/api/documents/${encodeURIComponent(id)}/download`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = originalName;
  try {
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}
