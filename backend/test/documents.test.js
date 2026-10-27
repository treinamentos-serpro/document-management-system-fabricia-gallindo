const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const test = require('node:test');
const { createApp } = require('../src/app');

async function startTestApp(context, maxFileSizeBytes = 32) {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-api-test-'));
  const app = createApp({ storageDirectory, maxFileSizeBytes });
  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  return { baseUrl, storageDirectory };
}

test('document API validates requests and isolates uploads by user', async (context) => {
  const { baseUrl, storageDirectory } = await startTestApp(context);
  const missingUser = await fetch(`${baseUrl}/api/documents`);
  assert.equal(missingUser.status, 400);
  assert.deepEqual(await missingUser.json(), {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'O cabeçalho X-User-Id é obrigatório.',
    },
  });

  const emptyList = await fetch(`${baseUrl}/api/documents`, {
    headers: { 'X-User-Id': 'alice' },
  });
  assert.equal(emptyList.status, 200);
  assert.deepEqual(await emptyList.json(), { documents: [] });

  const noFile = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: new FormData(),
  });
  assert.equal(noFile.status, 400);

  const form = new FormData();
  form.append('file', new Blob(['document contents'], { type: 'text/plain' }), 'notes.txt');
  const upload = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: form,
  });
  assert.equal(upload.status, 201);
  const { document } = await upload.json();
  assert.equal(document.originalName, 'notes.txt');
  assert.equal(document.owner, 'alice');
  assert.equal(document.size, 17);
  assert.equal(document.mimeType, 'text/plain');
  assert.equal(Object.hasOwn(document, 'storageName'), false);

  const aliceDocuments = await fetch(`${baseUrl}/api/documents`, {
    headers: { 'X-User-Id': 'alice' },
  });
  assert.deepEqual((await aliceDocuments.json()).documents.map(({ id }) => id), [document.id]);

  const bobDocuments = await fetch(`${baseUrl}/api/documents`, {
    headers: { 'X-User-Id': 'bob' },
  });
  assert.deepEqual(await bobDocuments.json(), { documents: [] });

  const inaccessibleDownload = await fetch(
    `${baseUrl}/api/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'bob' } }
  );
  assert.equal(inaccessibleDownload.status, 404);

  const download = await fetch(`${baseUrl}/api/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'alice' },
  });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'text/plain');
  assert.match(download.headers.get('content-disposition'), /^attachment;.*notes\.txt/);
  assert.equal(await download.text(), 'document contents');

  const invalidId = await fetch(`${baseUrl}/api/documents/not-a-uuid/download`, {
    headers: { 'X-User-Id': 'alice' },
  });
  assert.equal(invalidId.status, 400);

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['x'.repeat(33)]), 'large.txt');
  const oversizedUpload = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: oversizedForm,
  });
  assert.equal(oversizedUpload.status, 413);
  assert.equal((await oversizedUpload.json()).error.code, 'FILE_TOO_LARGE');
  assert.equal((await fs.readdir(storageDirectory)).length, 1);
});

test('document API rejects more than one file', async (context) => {
  const { baseUrl, storageDirectory } = await startTestApp(context, 1024);

  const form = new FormData();
  form.append('file', new Blob(['one']), 'one.txt');
  form.append('file', new Blob(['two']), 'two.txt');
  const response = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: form,
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  assert.deepEqual(await fs.readdir(storageDirectory), []);
});

test('unprefixed routes share metadata and files with /api routes', async (context) => {
  const { baseUrl, storageDirectory } = await startTestApp(context);
  const headers = { 'X-User-Id': 'alice' };
  const form = new FormData();
  form.append('file', new Blob(['x'.repeat(32)], { type: 'text/plain' }), 'report.txt');
  const upload = await fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
  assert.equal(upload.status, 201);
  const { document } = await upload.json();
  assert.deepEqual(Object.keys(document).sort(), [
    'id', 'mimeType', 'originalName', 'owner', 'size', 'uploadedAt',
  ]);
  assert.match(document.id, /^[0-9a-f-]{36}$/);
  assert.equal(new Date(document.uploadedAt).toISOString(), document.uploadedAt);

  const [storageName] = await fs.readdir(storageDirectory);
  assert.match(storageName, /^[0-9a-f-]{36}\.upload$/);
  assert.equal(await fs.readFile(path.join(storageDirectory, storageName), 'utf8'), 'x'.repeat(32));

  for (const prefix of ['', '/api']) {
    const list = await fetch(`${baseUrl}${prefix}/documents`, { headers });
    assert.equal(list.status, 200);
    assert.deepEqual(await list.json(), { documents: [document] });
    const download = await fetch(`${baseUrl}${prefix}/documents/${document.id}/download`, { headers });
    assert.equal(download.status, 200);
    assert.equal(await download.text(), 'x'.repeat(32));
  }

  const freshApp = createApp({ storageDirectory });
  const freshServer = freshApp.listen(0);
  await once(freshServer, 'listening');
  context.after(() => new Promise((resolve, reject) => {
    freshServer.close((error) => (error ? reject(error) : resolve()));
  }));
  const freshList = await fetch(`http://127.0.0.1:${freshServer.address().port}/documents`, { headers });
  assert.deepEqual(await freshList.json(), { documents: [] });
  assert.deepEqual(await fs.readdir(storageDirectory), [storageName]);
});

test('invalid headers and multipart bodies do not create files', async (context) => {
  const { baseUrl, storageDirectory } = await startTestApp(context);
  for (const endpoint of ['/upload', '/documents', '/documents/invalid/download']) {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: endpoint === '/upload' ? 'POST' : 'GET',
      headers: { 'X-User-Id': '   ' },
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }

  const wrongField = new FormData();
  wrongField.append('document', new Blob(['test']), 'test.txt');
  const extraField = new FormData();
  extraField.append('file', new Blob(['test']), 'test.txt');
  extraField.append('owner', 'bob');
  const requests = [
    { body: wrongField },
    { body: extraField },
    { headers: { 'Content-Type': 'multipart/form-data' }, body: 'invalid' },
    { headers: { 'Content-Type': 'multipart/form-data; boundary=missing' }, body: '--missing\r\n' },
  ];
  for (const request of requests) {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      ...request,
      headers: { 'X-User-Id': 'alice', ...request.headers },
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.deepEqual(await fs.readdir(storageDirectory), []);
});

test('missing documents and missing files return the same safe error', async (context) => {
  const { baseUrl, storageDirectory } = await startTestApp(context);
  const headers = { 'X-User-Id': 'alice' };
  const form = new FormData();
  form.append('file', new Blob(['test']), 'test.txt');
  const upload = await fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
  const { document } = await upload.json();
  const [storageName] = await fs.readdir(storageDirectory);
  await fs.unlink(path.join(storageDirectory, storageName));
  const log = context.mock.method(console, 'error', () => {});
  const missingFile = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers });
  const missingDocument = await fetch(
    `${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`,
    { headers }
  );
  assert.equal(missingFile.status, 404);
  assert.equal(missingDocument.status, 404);
  assert.deepEqual(await missingFile.json(), await missingDocument.json());
  assert.equal(log.mock.callCount(), 1);
});

test('filesystem upload failures are logged without exposing internal details', async (context) => {
  const { baseUrl, storageDirectory } = await startTestApp(context);
  await fs.rmdir(storageDirectory);
  await fs.writeFile(storageDirectory, 'not a directory');
  const log = context.mock.method(console, 'error', () => {});
  const form = new FormData();
  form.append('file', new Blob(['test']), 'test.txt');
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'alice' },
    body: form,
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
  });
  assert.equal(log.mock.callCount(), 1);
});
