# Document Management System com GitHub Copilot

<img src="https://octodex.github.com/images/Professortocat_v2.png" align="right" height="200px" />

Hey frgallindo!

Mona here. I'm done preparing your exercise. Hope you enjoy! 💚

Remember, it's self-paced so feel free to take a break! ☕️

[![](https://img.shields.io/badge/Go%20to%20Exercise-%E2%86%92-1f883d?style=for-the-badge&logo=github&labelColor=197935)](https://github.com/treinamentos-serpro/document-management-system-fabricia-gallindo/issues/1)

---

## Backend

Para instalar e iniciar:

```sh
cd backend
npm ci
npm start
```

A implementação segue `routes -> controllers -> services -> repositories`.
O roteador é registrado em `backend/src/app.js` e oferece:

| Método | Caminho | Resultado |
| ------ | ------- | --------- |
| POST | `/upload` | Recebe um arquivo no campo multipart `file` e retorna `{ document }` com status 201. |
| GET | `/documents` | Retorna `{ documents }` do usuário, do mais recente para o mais antigo. |
| GET | `/documents/:id/download` | Retorna o arquivo como anexo, usando o nome original. |

Os mesmos endpoints estão disponíveis sob `/api` para o frontend.
Todas as operações exigem o cabeçalho `X-User-Id` não vazio. Esse cabeçalho
é apenas um contexto de demonstração fornecido pelo cliente, **não autenticação**;
ele pode ser falsificado e não protege documentos em produção.

```sh
curl -H 'X-User-Id: demo' -F 'file=@./documento.pdf' http://localhost:3000/upload
curl -H 'X-User-Id: demo' http://localhost:3000/documents
curl -H 'X-User-Id: demo' -OJ http://localhost:3000/documents/UUID/download
```

O `multer` usa `diskStorage` e nomes internos aleatórios em `backend/storage`,
independentemente do diretório de execução. Os metadados ficam em memória:
reiniciar o processo esvazia a listagem, mesmo que os arquivos permaneçam no disco.
Não há recuperação automática desses arquivos.

| Variável | Padrão | Validação |
| -------- | ------ | --------- |
| `PORT` | `3000` | Inteiro de 1 a 65535. |
| `MAX_FILE_SIZE_BYTES` | `10485760` (10 MiB) | Inteiro positivo seguro. |

Configuração inválida impede a inicialização. O upload aceita exatamente um
arquivo, sem campos adicionais. Erros retornam `{ error: { code, message } }`,
com status 400 (entrada inválida), 413 (limite excedido), 404 (documento de outro
usuário, inexistente ou arquivo indisponível) ou 500 (falha interna), sem expor
caminhos locais.

Execute os testes com `npm test --prefix backend` a partir da raiz do projeto.

## Frontend

Com o backend em execução na porta 3000, abra outro terminal:

```sh
cd frontend
npm ci
npm run dev
```

Acesse `http://localhost:5173`. O Vite encaminha `/api` para o backend.
`App.jsx` monta a página de documentos, que reutiliza `UploadComponent`,
`DocumentList` e `DownloadButton`. O cliente `src/services/documentsApi.js`
centraliza `fetch`, multipart, erros e downloads binários com URLs temporárias.
O cabeçalho `X-User-Id: demo-user` é enviado em todas as operações.

A interface carrega a lista ao abrir, atualiza-a após uploads e informa estados
de carregamento, sucesso e erro. Cada botão de download mantém seu próprio
estado, permitindo baixar arquivos diferentes sem bloquear a lista.
Se um upload concluir mas a atualização da lista falhar, a interface informa
os dois resultados sem incentivar o reenvio do mesmo arquivo.

Execute `npm test --prefix frontend` e `npm run build --prefix frontend`
a partir da raiz para validar o cliente e gerar o build.
O proxy do Vite é de desenvolvimento; em produção, configure o servidor para
encaminhar `/api` ao backend e servir os arquivos de `frontend/dist`.

&copy; 2025 GitHub &bull; [Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md) &bull; [MIT License](https://gh.io/mit)
