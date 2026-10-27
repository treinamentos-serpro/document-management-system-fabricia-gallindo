const crypto = require('node:crypto');
const path = require('node:path');

function createDocumentMetadata(owner, uploadedFile) {
  const originalName = path.basename(uploadedFile.originalname.replaceAll('\\', '/'))
    .replace(/[\r\n\0]/g, '')
    .trim() || 'document';
  const mimeType = /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(uploadedFile.mimetype)
    ? uploadedFile.mimetype
    : 'application/octet-stream';

  return {
    id: crypto.randomUUID(),
    originalName,
    size: uploadedFile.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: uploadedFile.filename,
    mimeType,
  };
}

module.exports = createDocumentMetadata;