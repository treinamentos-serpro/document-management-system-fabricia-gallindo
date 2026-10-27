const assert = require('node:assert/strict');
const test = require('node:test');
const createDocumentService = require('../src/services/documentService');
const createDocumentRepository = require('../src/repositories/documentRepository');
const createDocumentMetadata = require('../src/services/documentMetadataFactory');

test('metadata factory sanitizes the client name and validates the MIME format', () => {
  const document = createDocumentMetadata('alice', {
    filename: 'internal.upload',
    originalname: '..\\reports\\quarter\nly.txt',
    mimetype: 'text/plain; charset=utf-8',
    size: 4,
  });

  assert.equal(document.originalName, 'quarterly.txt');
  assert.equal(document.mimeType, 'application/octet-stream');
  assert.equal(document.owner, 'alice');
  assert.equal(document.storageName, 'internal.upload');
  assert.equal(document.size, 4);
  assert.equal(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
  assert.match(document.id, /^[0-9a-f-]{36}$/);
});

test('repository lists only the owner documents in descending upload order', () => {
  const repository = createDocumentRepository();
  const older = { id: 'older', owner: 'alice', uploadedAt: '2026-01-01T00:00:00.000Z' };
  const newer = { id: 'newer', owner: 'alice', uploadedAt: '2026-02-01T00:00:00.000Z' };
  repository.create(older);
  repository.create({ id: 'other', owner: 'bob', uploadedAt: '2026-03-01T00:00:00.000Z' });
  repository.create(newer);
  assert.deepEqual(repository.listByOwner('alice'), [newer, older]);
  assert.equal(repository.findByIdAndOwner('newer', 'bob'), null);
});

test('service removes the uploaded file when metadata registration fails', async () => {
  const failure = new Error('Falha no repositório.');
  const removed = [];
  const service = createDocumentService(
    { async create() { throw failure; } },
    { async remove(storageName) { removed.push(storageName); } }
  );
  await assert.rejects(service.create('alice', {
    filename: 'internal.upload', originalname: 'test.txt', mimetype: 'text/plain', size: 4,
  }), (error) => error === failure);
  assert.deepEqual(removed, ['internal.upload']);
});

test('service logs cleanup failures and preserves the registration error', async (context) => {
  const failure = new Error('Falha no repositório.');
  const cleanupFailure = new Error('Falha na remoção.');
  const log = context.mock.method(console, 'error', () => {});
  const service = createDocumentService(
    { create() { throw failure; } },
    { async remove() { throw cleanupFailure; } }
  );
  await assert.rejects(service.create('alice', {
    filename: 'internal.upload', originalname: 'test.txt', mimetype: 'text/plain', size: 4,
  }), (error) => error === failure);
  assert.equal(log.mock.calls[0].arguments[1], cleanupFailure);
});

test('service checks ownership before resolving file paths', () => {
  const repository = createDocumentRepository();
  repository.create({ id: 'document', owner: 'alice', storageName: 'internal.upload' });
  const service = createDocumentService(repository, {
    getPath() { assert.fail('Não deve resolver caminhos de outro usuário.'); },
  });
  assert.throws(() => service.getDownload('bob', 'document'), { status: 404 });
  assert.throws(() => service.getDownload('alice', 'missing'), { status: 404 });
});
