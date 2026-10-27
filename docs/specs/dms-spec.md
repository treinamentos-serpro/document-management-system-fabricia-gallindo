# Especificação - Document Management System

> Especificação funcional e técnica do DMS. Este documento orienta as etapas
> futuras de implementação; não implementa nem altera arquivos de backend ou
> frontend.

## 1. Objetivo

Disponibilizar uma aplicação web simples para que usuários enviem documentos,
consultem os próprios documentos e baixem seus arquivos, armazenados no
filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição HTTP.
- Listagem dos documentos associados ao usuário da requisição.
- Download de um documento pelo identificador, respeitando seu dono.
- Interface web para envio, listagem e download.
- Metadados mantidos em memória durante a execução do backend.
- Arquivos persistidos em `backend/storage`, usando `multer` com `diskStorage`.
- Configuração operacional por variáveis de ambiente.

### Fora do escopo

- Armazenamento em nuvem, provedores externos ou serviços de upload de terceiros.
- Banco de dados para metadados ou persistência dos metadados após reinicialização.
- Versionamento, edição, exclusão, compartilhamento ou busca avançada de documentos.
- Cadastro, autenticação ou autorização completa de usuários.
- Garantia de disponibilidade dos arquivos em múltiplas instâncias do backend.
- Digitalização, pré-visualização, conversão ou processamento do conteúdo enviado.

## 3. Requisitos funcionais

| ID    | Requisito |
| ----- | --------- |
| RF-01 | O usuário pode enviar um arquivo por vez usando formulário `multipart/form-data`. |
| RF-02 | O sistema deve rejeitar requisições de upload sem arquivo ou com mais de um arquivo. |
| RF-03 | Ao aceitar um arquivo, o sistema deve armazená-lo em `backend/storage` por meio de `multer` configurado com `diskStorage`. |
| RF-04 | O sistema deve gerar um identificador único e um nome interno seguro para o arquivo; o nome original não deve ser usado como caminho de armazenamento. |
| RF-05 | Após o upload bem-sucedido, o sistema deve registrar e retornar os metadados do documento, incluindo o dono. |
| RF-06 | O usuário pode listar os metadados dos documentos associados à sua identidade, sem receber caminhos internos do filesystem. |
| RF-07 | O usuário pode baixar um documento existente pelo identificador, se o documento pertencer à sua identidade. |
| RF-08 | O sistema deve responder com `404` para documento inexistente e não revelar a existência de documentos pertencentes a outro usuário. |
| RF-09 | A interface deve apresentar o formulário de upload, o estado da lista de documentos e uma ação de download para cada documento listado. |
| RF-10 | A interface deve informar ao usuário estados de carregamento, sucesso e erro das operações. |
| RF-11 | O frontend deve consumir a API via `fetch` usando o prefixo `/api`, encaminhado ao backend pelo proxy do Vite em desenvolvimento. |
| RF-12 | Se o processo reiniciar, os arquivos existentes podem permanecer no disco, mas os respectivos metadados em memória não são recuperados; o sistema não deve apresentar esses arquivos como documentos listáveis. |

### Identidade e propriedade dos documentos

O seed não define autenticação nem cadastro de usuários. Para delimitar a
propriedade nesta primeira versão, cada operação de API deve receber o
identificador do usuário no cabeçalho `X-User-Id`. O backend deve validar que o
valor existe e não está vazio; esse valor será usado como `owner` e para limitar
listagem e download.

`X-User-Id` é apenas um contexto de usuário fornecido pelo cliente, não uma
credencial. Sem autenticação, ele pode ser falsificado e não oferece segurança
de acesso em produção. A aplicação deve deixar essa limitação explícita; a
introdução de autenticação real requer decisão e escopo próprios.


## 4. Requisitos não funcionais

| ID     | Requisito |
| ------ | --------- |
| RNF-01 | O backend deve usar Node.js e Express, em CommonJS, seguindo as dependências já definidas no projeto. |
| RNF-02 | O armazenamento de arquivos deve ser exclusivamente local, em `backend/storage`, com `multer` e `diskStorage`; armazenamento externo é proibido. |
| RNF-03 | Os metadados devem residir em memória nesta fase e não devem ser tratados como persistentes entre reinicializações. |
| RNF-04 | A configuração deve ser feita por variáveis de ambiente, seguindo o princípio de configuração externa do 12-Factor. |
| RNF-05 | O backend deve manter a direção de dependências `routes -> controllers -> services -> repositories`; regras de negócio não devem depender de Express ou do filesystem diretamente. |
| RNF-06 | O frontend deve usar React funcional com Hooks, organizado em `components/`, `pages/` e `services/`, e consumir o backend via `fetch`. |
| RNF-07 | O sistema deve gerar nomes internos de arquivo não controlados pelo cliente e impedir traversal de diretório ao gravar ou localizar arquivos. |
| RNF-08 | A API deve usar códigos HTTP e respostas de erro consistentes, sem retornar stack traces, caminhos locais ou detalhes internos ao cliente. |
| RNF-09 | O backend deve tratar erros de validação, upload, leitura e escrita de arquivos nos limites da aplicação e registrar falhas operacionais sem ocultá-las. |
| RNF-10 | A solução deve ser compatível com os scripts existentes do backend (`node --test`) e frontend (`vite build`). |

### Configuração operacional proposta

| Variável | Obrigatória | Padrão | Uso |
| -------- | ----------- | ------ | --- |
| `PORT` | Não | `3000` | Porta HTTP do backend. |
| `MAX_FILE_SIZE_BYTES` | Não | `10485760` | Limite de tamanho por arquivo (10 MiB). |

Variáveis opcionais, quando informadas, devem ser validadas na inicialização.
Valores inválidos devem impedir o início do servidor com mensagem operacional
clara. O limite de tamanho deve ser aplicado pelo middleware de upload. O
diretório de armazenamento é fixo em `backend/storage`, resolvido relativamente
à raiz do projeto e não ao diretório corrente do processo. Não há lista de
extensões ou tipos MIME permitidos nesta versão.

## 5. Modelo de dados (metadados do documento)

Os metadados são armazenados em memória pelo repositório durante a vida do
processo. O objeto interno e a representação pública da API são:

| Campo | Tipo | Presente na API | Descrição |
| ----- | ---- | --------------- | --------- |
| `id` | string | Sim | Identificador único, gerado pelo servidor (UUID). |
| `originalName` | string | Sim | Nome original informado pelo cliente; dado de apresentação, nunca caminho de disco. |
| `size` | number | Sim | Tamanho do conteúdo em bytes. |
| `uploadedAt` | string | Sim | Data e hora do upload em UTC, formato ISO 8601. |
| `owner` | string | Sim | Identificador recebido em `X-User-Id`. |
| `storageName` | string | Não | Nome interno aleatório usado no filesystem, sem diretório. |
| `mimeType` | string | Sim | Tipo MIME informado/detectado para a resposta de download; não deve ser considerado prova de segurança do conteúdo. |

### Regras e invariantes

- `id` não pode ser escolhido pelo cliente e não muda após a criação.
- `storageName` deve ser gerado pelo servidor, sem componentes de diretório e
  sem depender de `originalName`.
- `owner` deve vir do contexto da requisição, nunca de um campo de formulário.
- `size` deve corresponder ao arquivo gravado e respeitar `MAX_FILE_SIZE_BYTES`.
- `uploadedAt` deve ser criado pelo servidor no instante de conclusão do upload.
- O repositório deve disponibilizar operações de criação, busca por `id` e
  listagem por `owner`; a consulta por `id` usada no download deve verificar
  também o dono antes de disponibilizar o caminho do arquivo.
- `storageName` e caminhos absolutos ou relativos de disco são dados internos e
  nunca devem ser serializados em respostas públicas.

## 6. Contratos de API

### Convenções gerais

- Base da API: `/api`.
- Formato padrão de metadados e erros: JSON em UTF-8.
- O cabeçalho `X-User-Id` é obrigatório em todas as operações de documentos.
- O cliente não define `id`, `owner`, `uploadedAt` nem o nome interno do arquivo.
- O frontend usa o proxy `/api` do Vite em desenvolvimento. A URL do backend
  não deve ser codificada em componentes.

### `POST /api/upload`

Envia um arquivo e registra seus metadados.

**Cabeçalhos**

```http
X-User-Id: <identificador-do-usuário>
Content-Type: multipart/form-data
```

**Corpo**

Campo multipart obrigatório `file`, contendo exatamente um arquivo. Campos
adicionais não fazem parte do contrato.

**Sucesso — `201 Created`**

```json
{
  "document": {
    "id": "uuid",
    "originalName": "relatorio.pdf",
    "size": 12345,
    "uploadedAt": "2026-10-26T19:09:02.183Z",
    "owner": "usuario-123",
    "mimeType": "application/pdf"
  }
}
```

O corpo não inclui `storageName` nem caminho do filesystem.

**Erros**

| Status | Situação |
| ------ | -------- |
| `400 Bad Request` | Campo `file` ausente, múltiplos arquivos, campo obrigatório inválido ou corpo multipart inválido. |
| `413 Payload Too Large` | Arquivo acima de `MAX_FILE_SIZE_BYTES`. |
| `500 Internal Server Error` | Falha ao gravar o arquivo ou registrar metadados. Se o registro falhar após a gravação, remover o arquivo parcial para evitar órfão. |

### `GET /api/documents`

Lista os metadados dos documentos do usuário atual.

**Cabeçalhos**

```http
X-User-Id: <identificador-do-usuário>
```

**Sucesso — `200 OK`**

```json
{
  "documents": [
    {
      "id": "uuid",
      "originalName": "relatorio.pdf",
      "size": 12345,
      "uploadedAt": "2026-10-26T19:09:02.183Z",
      "owner": "usuario-123",
      "mimeType": "application/pdf"
    }
  ]
}
```

Quando não houver documentos, `documents` deve ser uma lista vazia. A ordem
deve ser da data de upload mais recente para a mais antiga.

**Erros**

| Status | Situação |
| ------ | -------- |
| `400 Bad Request` | Cabeçalho `X-User-Id` ausente ou vazio. |
| `500 Internal Server Error` | Falha inesperada ao consultar o repositório. |

### `GET /api/documents/:id/download`

Baixa o conteúdo de um documento pertencente ao usuário atual.

**Cabeçalhos**

```http
X-User-Id: <identificador-do-usuário>
```

**Sucesso — `200 OK`**

Corpo binário do arquivo com `Content-Type` compatível com o metadado e
`Content-Disposition: attachment`, usando o nome original de forma segura e
adequadamente codificada. A resposta não deve expor o caminho local.

**Erros**

| Status | Situação |
| ------ | -------- |
| `400 Bad Request` | Cabeçalho `X-User-Id` ausente ou vazio, ou identificador inválido. |
| `404 Not Found` | Documento inexistente, pertencente a outro usuário ou arquivo indisponível no disco. |
| `500 Internal Server Error` | Falha inesperada ao ler/enviar o arquivo. |

### Formato de erro

Respostas de erro da API devem seguir o formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição segura e compreensível do erro."
  }
}
```

O valor de `code` deve ser estável para a categoria do erro (`VALIDATION_ERROR`,
`FILE_TOO_LARGE`, `DOCUMENT_NOT_FOUND` ou `INTERNAL_ERROR`). A mensagem não
deve revelar stack trace, caminho, nome interno ou existência de documento de
outro usuário. Em respostas de download que já iniciaram o envio binário, não
se deve tentar substituir parcialmente o corpo por JSON; registrar a falha e
encerrar a resposta conforme o comportamento HTTP apropriado.

## 7. Decisões arquiteturais

### Backend

Fluxo de dependência obrigatório:

```text
routes -> controllers -> services -> repositories
```

- `routes/`: registra `/api/upload`, `/api/documents` e
  `/api/documents/:id/download`, conectando middlewares e controllers.
- `controllers/`: lê cabeçalhos, parâmetros e arquivo recebido; valida a
  entrada HTTP e traduz o resultado em status, cabeçalhos e respostas.
- `services/`: concentra regras de upload, propriedade, listagem e download,
  sem conhecer objetos de Express.
- `repositories/`: mantém metadados em memória e integra a persistência local
  dos arquivos. O uso de `multer` com `diskStorage` deve gravar em
  `backend/storage`.
- A configuração do upload deve aplicar limites e nomes internos gerados pelo
  servidor. A validação de entrada não deve depender apenas do nome ou MIME
  informado pelo cliente.
- Erros de negócio e infraestrutura devem ser traduzidos em respostas HTTP nos
  limites da aplicação, preservando registro operacional das falhas.

### Frontend

- React com componentes funcionais e Hooks, organizado nas pastas previstas:
  `components/`, `pages/` e `services/`.
- O serviço de API centraliza chamadas `fetch`, cabeçalhos e tratamento de
  respostas/erros.
- A interface deve exibir nome, tamanho e data de envio; não deve exibir
  caminhos internos.
- Para fins do seed sem autenticação, o frontend deve fornecer um identificador
  de usuário de demonstração consistente nas chamadas, claramente identificado
  como contexto não autenticado. Isso não substitui autenticação.
- Downloads devem ser iniciados pelo navegador a partir da resposta binária da
  API, sem expor detalhes internos de armazenamento.

### Armazenamento e falhas

- Arquivos são gravados apenas no filesystem local da aplicação, em
  `backend/storage`, e não devem sair desse diretório.
- Os metadados existem somente em memória. Não fazer inferência ou reconstrução
  automática a partir dos arquivos no diretório.
- Operações que falhem devem retornar erro explícito e seguro. Não simular
  sucesso, ignorar falhas ou retornar resultados vazios como fallback para
  erros do repositório.
- A identidade enviada em `X-User-Id` não fornece autenticação. A aplicação é
  adequada apenas ao contexto de demonstração definido pelo projeto enquanto
  não houver mecanismo de autenticação aprovado.

## 8. Plano de execução

Etapas futuras, em ordem. Este plano descreve entregas e critérios; a criação
desta especificação não executa nem modifica arquivos de backend ou frontend.

1. **Preparar configuração e limites da aplicação** — definir leitura e
   validação das variáveis de ambiente, diretório local de armazenamento e
   limite de upload. Critério: configuração inválida falha claramente e os
   padrões estão documentados.
2. **Implementar persistência local e metadados em memória** — estabelecer
   upload com `multer`/`diskStorage`, nomes internos seguros e operações do
   repositório. Critério: o arquivo fica no diretório local e metadados
   respeitam o modelo e a propriedade definidos.
3. **Implementar regras de negócio** — criar fluxos de upload, listagem por
   usuário e localização/download com verificação de propriedade. Critério:
   serviços exercitáveis sem depender da camada HTTP.
4. **Expor os contratos HTTP** — conectar rotas e controllers para os três
   endpoints, incluindo validação, status e formato consistente de erros.
   Critério: API corresponde aos contratos desta especificação.
5. **Validar backend com testes** — cobrir casos de sucesso, entrada inválida,
   limite de tamanho, isolamento por dono, arquivo ausente e falhas de
   filesystem/repositório. Critério: testes automatizados do backend passam.
6. **Construir a interface web** — implementar serviço `fetch`, formulário de
   upload, listagem, estados de carregamento/erro/sucesso e download. Critério:
   operações são utilizáveis via proxy `/api`, sem URL de backend codificada
   nos componentes.
7. **Verificar integração e documentação operacional** — executar validação
   de build do frontend e testes do backend; documentar inicialização,
   variáveis e limitações de identidade e persistência. Critério: fluxos
   previstos funcionam em conjunto e limitações estão explícitas.
