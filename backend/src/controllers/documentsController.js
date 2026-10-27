const AppError = require('../errors/appError');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicDocument({ id, originalName, size, uploadedAt, owner, mimeType }) {
  return { id, originalName, size, uploadedAt, owner, mimeType };
}

function createDocumentsController(documentService) {
  function requireUser(request, _response, next) {
    const owner = request.get('X-User-Id')?.trim();
    if (!owner) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'O cabeçalho X-User-Id é obrigatório.'));
    }
    request.owner = owner;
    next();
  }

  return {
    requireUser,

    async upload(request, response) {
      const document = await documentService.create(request.owner, request.file);
      response.status(201).json({ document: publicDocument(document) });
    },

    list(request, response) {
      const documents = documentService.list(request.owner).map(publicDocument);
      response.json({ documents });
    },

    async download(request, response, next) {
      if (!UUID_PATTERN.test(request.params.id)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Identificador de documento inválido.');
      }

      const { document, filePath } = documentService.getDownload(request.owner, request.params.id);
      response.download(
        filePath,
        document.originalName,
        { headers: { 'Content-Type': document.mimeType } },
        (error) => {
          if (error) {
            if (error.code === 'ENOENT' && !response.headersSent) {
              console.error('Arquivo de documento indisponível:', error);
              return next(new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
            }
            if (response.headersSent) {
              console.error('Falha durante o envio do arquivo:', error);
              return response.destroy(error);
            }
            return next(error);
          }
        }
      );
    },
  };
}

module.exports = createDocumentsController;
