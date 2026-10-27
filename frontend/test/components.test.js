import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let vite;

before(async () => {
  vite = await createServer({
    server: { middlewareMode: true, hmr: false, watch: null },
  });
});

after(async () => {
  await vite?.close();
});

async function render(modulePath, props) {
  const { default: Component } = await vite.ssrLoadModule(modulePath);
  return renderToStaticMarkup(createElement(Component, props));
}

test('upload component associates its label and disables submission without a file', async () => {
  const html = await render('/src/components/UploadComponent.jsx', { onUpload() {} });
  assert.match(html, /type="file"/);
  assert.match(html, /name="file"/);
  assert.match(html, /required/);
  assert.match(html, /type="submit" disabled/);
  const id = /<input id="([^"]+)"/.exec(html)[1];
  assert.ok(html.includes(`for="${id}"`));
  const busy = await render('/src/components/UploadComponent.jsx', { disabled: true });
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /Enviando/);
});

test('document list renders empty state, metadata and accessible download buttons', async () => {
  const empty = await render('/src/components/DocumentList.jsx', { documents: [] });
  assert.match(empty, /Nenhum documento enviado ainda/);
  const html = await render('/src/components/DocumentList.jsx', {
    documents: [{
      id: 'one', originalName: '<report>.txt', size: 2048,
      uploadedAt: '2026-10-26T12:00:00.000Z',
    }],
    onDownload() {},
  });
  assert.match(html, /&lt;report&gt;\.txt/);
  assert.match(html, /2\.0 KB/);
  assert.match(html, /2026/);
  assert.match(html, /aria-label="Baixar &lt;report&gt;\.txt"/);
  assert.match(html, /type="button"/);
});

test('App mounts the upload and list interface and discloses the unauthenticated user', async () => {
  const html = await render('/src/App.jsx');
  assert.match(html, /<main class="page-shell">/);
  assert.match(html, /Enviar documento/);
  assert.match(html, /Carregando documentos/);
  assert.match(html, /demo-user/);
  assert.match(html, /Não há autenticação/);
});
