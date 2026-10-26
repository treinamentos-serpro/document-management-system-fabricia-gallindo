const path = require('node:path');

function readPositiveInteger(name, defaultValue, maximum = Number.MAX_SAFE_INTEGER) {
  const value = process.env[name];
  const parsed = value === undefined ? defaultValue : Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${name} deve ser um número inteiro positivo menor ou igual a ${maximum}.`);
  }

  return parsed;
}

const config = {
  port: readPositiveInteger('PORT', 3000, 65535),
  maxFileSizeBytes: readPositiveInteger('MAX_FILE_SIZE_BYTES', 10 * 1024 * 1024),
  storageDirectory: path.resolve(__dirname, '..', 'storage'),
};

module.exports = config;
