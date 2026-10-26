import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/documentsApi.js';

test('list uses /api and the demonstration user header', async (context) => {
  const documents = [{ id: 'one', originalName: 'test.txt' }];
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ documents }));
  assert.deepEqual(await listDocuments(), documents);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/documents');
  assert.equal(options.headers['X-User-Id'], 'demo-user');
});

test('upload sends exactly one file as multipart without overriding its content type', async (context) => {
  const document = { id: 'one', originalName: 'test.txt' };
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ document }, { status: 201 }));
  const file = new File(['content'], 'test.txt', { type: 'text/plain' });
  assert.deepEqual(await uploadDocument(file), document);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/upload');
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['X-User-Id'], 'demo-user');
  assert.equal(Object.hasOwn(options.headers, 'Content-Type'), false);
  assert.deepEqual([...options.body.keys()], ['file']);
  assert.equal(options.body.get('file').name, 'test.txt');
  assert.equal(await options.body.get('file').text(), 'content');
});

test('list forwards cancellation so stale requests can be aborted', async (context) => {
  const controller = new AbortController();
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ documents: [] }));
  await listDocuments({ signal: controller.signal });
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal, controller.signal);
});

test('API errors and non-JSON HTTP errors are explicit', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: { message: 'Documento não encontrado.' } }, { status: 404 }));
  await assert.rejects(listDocuments(), /Documento não encontrado/);
  fetchMock.mock.mockImplementation(async () => new Response('<html>Erro</html>', { status: 502 }));
  await assert.rejects(listDocuments(), /HTTP 502/);
});

test('network and invalid successful response errors are not turned into empty results', async (context) => {
  const failure = new TypeError('Falha na conexão.');
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => { throw failure; });
  await assert.rejects(listDocuments(), (error) => error === failure);
  fetchMock.mock.mockImplementation(async () => new Response('invalid JSON'));
  await assert.rejects(listDocuments(), SyntaxError);
});

test('download encodes identifiers and releases the temporary URL and link', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () =>
    new Response('content', { headers: { 'Content-Type': 'text/plain' } }));
  let clicked = false;
  let removed = false;
  let appended;
  const link = {
    click() { clicked = true; },
    remove() { removed = true; },
  };
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  context.after(() => {
    for (const [name, descriptor] of [['document', originalDocument], ['window', originalWindow]]) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement(tag) { assert.equal(tag, 'a'); return link; },
    body: { append(element) { appended = element; } },
  } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    setTimeout(callback) { callback(); },
  } });
  const createUrl = context.mock.method(URL, 'createObjectURL', () => 'blob:test');
  const revokeUrl = context.mock.method(URL, 'revokeObjectURL', () => {});
  await downloadDocument('id/with spaces', 'relatório.txt');
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/documents/id%2Fwith%20spaces/download');
  assert.equal(fetchMock.mock.calls[0].arguments[1].headers['X-User-Id'], 'demo-user');
  assert.equal(await createUrl.mock.calls[0].arguments[0].text(), 'content');
  assert.equal(link.href, 'blob:test');
  assert.equal(link.download, 'relatório.txt');
  assert.equal(appended, link);
  assert.equal(clicked, true);
  assert.equal(removed, true);
  assert.deepEqual(revokeUrl.mock.calls[0].arguments, ['blob:test']);
});

test('failed download does not create a temporary URL', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: { message: 'Documento não encontrado.' } }, { status: 404 }));
  const createUrl = context.mock.method(URL, 'createObjectURL', () => assert.fail('Não deve criar URL.'));
  await assert.rejects(downloadDocument('missing', 'test.txt'), /Documento não encontrado/);
  assert.equal(createUrl.mock.callCount(), 0);
});
