const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const createFileRepository = require('../src/repositories/fileRepository');

test('file repository confines file paths to the storage directory', async (context) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-repository-test-'));
  context.after(() => fs.rm(storageDirectory, { recursive: true, force: true }));
  const repository = createFileRepository(storageDirectory, 1024);
  for (const name of ['', '.', '..', '../outside', '/tmp/outside', '..\\outside', 'bad\0name', null]) {
    assert.throws(() => repository.getPath(name), /Nome interno de arquivo inválido/);
  }
  assert.equal(repository.getPath('internal.upload'), path.join(storageDirectory, 'internal.upload'));
  await fs.writeFile(repository.getPath('internal.upload'), 'test');
  await repository.remove('internal.upload');
  assert.deepEqual(await fs.readdir(storageDirectory), []);
});
