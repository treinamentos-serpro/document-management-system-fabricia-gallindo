const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const test = require('node:test');
const { createApp } = require('../src/app');

test('document API validates requests and isolates uploads by user', async (context) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-api-test-'));
  const app = createApp({ storageDirectory, maxFileSizeBytes: 32 });
  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

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
});

test('document API rejects more than one file', async (context) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-api-test-'));
  const app = createApp({ storageDirectory, maxFileSizeBytes: 1024 });
  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  context.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

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
