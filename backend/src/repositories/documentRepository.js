function createDocumentRepository() {
  const documents = new Map();

  return {
    create(document) {
      documents.set(document.id, document);
      return document;
    },

    findByIdAndOwner(id, owner) {
      const document = documents.get(id);
      return document?.owner === owner ? document : null;
    },

    listByOwner(owner) {
      return [...documents.values()]
        .filter((document) => document.owner === owner)
        .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
    },
  };
}

module.exports = createDocumentRepository;
