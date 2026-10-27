const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

function createFileRepository(storageDirectory, maxFileSizeBytes) {
  fs.mkdirSync(storageDirectory, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination(_request, _file, callback) {
        callback(null, storageDirectory);
      },
      filename(_request, _file, callback) {
        callback(null, `${crypto.randomUUID()}.upload`);
      },
    }),
    limits: {
      // O parser sinaliza limite ao atingi-lo, não apenas ao ultrapassá-lo.
      fileSize: maxFileSizeBytes + 1,
      files: 1,
      fields: 0,
    },
  });

  return {
    upload,

    getPath(storageName) {
      if (
        typeof storageName !== 'string'
        || !storageName
        || storageName === '.'
        || storageName === '..'
        || /[\\/\0]/.test(storageName)
        || path.basename(storageName) !== storageName
      ) {
        throw new Error('Nome interno de arquivo inválido.');
      }
      return path.join(storageDirectory, storageName);
    },

    async remove(storageName) {
      await fs.promises.unlink(this.getPath(storageName));
    },
  };
}

module.exports = createFileRepository;
