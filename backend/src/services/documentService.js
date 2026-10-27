const AppError = require('../errors/appError');
const createDocumentMetadata = require('./documentMetadataFactory');

function createDocumentService(documentRepository, fileRepository) {
  return {
    async create(owner, uploadedFile) {
      if (!uploadedFile) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Envie um arquivo no campo file.');
      }

      const document = createDocumentMetadata(owner, uploadedFile);

      try {
        await documentRepository.create(document);
        return document;
      } catch (error) {
        try {
          await fileRepository.remove(uploadedFile.filename);
        } catch (cleanupError) {
          console.error('Falha ao remover arquivo após erro no registro de metadados:', cleanupError);
        }
        throw error;
      }
    },

    list(owner) {
      return documentRepository.listByOwner(owner);
    },

    getDownload(owner, id) {
      const document = documentRepository.findByIdAndOwner(id, owner);
      if (!document) {
        throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }

      return {
        document,
        filePath: fileRepository.getPath(document.storageName),
      };
    },
  };
}

module.exports = createDocumentService;
