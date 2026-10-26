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
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || 'Não foi possível concluir a operação.');
  }

  return response;
}

export async function listDocuments() {
  const response = await request('/api/documents');
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
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
