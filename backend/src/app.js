const express = require('express');
const config = require('./config');
const AppError = require('./errors/appError');
const createDocumentRepository = require('./repositories/documentRepository');
const createFileRepository = require('./repositories/fileRepository');
const createDocumentService = require('./services/documentService');
const createDocumentsController = require('./controllers/documentsController');
const createDocumentsRoutes = require('./routes/documentsRoutes');

function createApp(options = {}) {
  const storageDirectory = options.storageDirectory ?? config.storageDirectory;
  const maxFileSizeBytes = options.maxFileSizeBytes ?? config.maxFileSizeBytes;
  const documentRepository = createDocumentRepository();
  const fileRepository = createFileRepository(storageDirectory, maxFileSizeBytes);
  const documentService = createDocumentService(documentRepository, fileRepository);
  const controller = createDocumentsController(documentService);
  const app = express();

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api', createDocumentsRoutes(controller, fileRepository.upload));

  app.use((error, _request, response, _next) => {
    if (response.headersSent) {
      return response.end();
    }

    if (error?.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
      });
    }

    if (error instanceof multerError) {
      return response.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Requisição de upload inválida.' },
      });
    }

    if (
      error?.message === 'Unexpected end of form'
      || error?.message === 'Multipart: Boundary not found'
    ) {
      return response.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Requisição de upload inválida.' },
      });
    }

    if (error instanceof AppError) {
      return response.status(error.status).json({
        error: { code: error.code, message: error.message },
      });
    }

    console.error('Erro inesperado na API:', error);
    return response.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' },
    });
  });

  return app;
}

const multerError = require('multer').MulterError;
const app = createApp();

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`DMS backend ouvindo na porta ${config.port}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
