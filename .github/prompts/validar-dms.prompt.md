---
name: validar-dms
description: "Valida alterações no DMS com testes direcionados, contratos da API e build do frontend."
argument-hint: "Escopo da validação: backend, frontend ou ambos; arquivos ou funcionalidade alterada"
agent: agent
---

# Validar alterações no DMS

Valide as alterações indicadas na mensagem do usuário. Se nenhum escopo for
informado, use o diff atual para identificar as superfícies afetadas.
Se não houver alterações nem escopo informado, peça o escopo antes de executar.

Siga as [instruções do projeto](../copilot-instructions.md) e consulte os
[contratos do DMS](../../docs/specs/dms-spec.md) relevantes para a alteração.

## Procedimento

1. Leia o diff e os testes relacionados antes de executar comandos.
2. Confira os scripts disponíveis nos arquivos
   [backend/package.json](../../backend/package.json) e
   [frontend/package.json](../../frontend/package.json).
3. Execute a menor validação que cubra a alteração. A partir da raiz:
   - Backend: `npm test --prefix backend`.
   - Frontend: `npm test --prefix frontend`, se o script estiver disponível,
     e `npm run build --prefix frontend`.
   - Para um único módulo, prefira os testes direcionados existentes.
4. Quando afetados, confira estes contratos nos testes:
   - Upload: exatamente um campo de arquivo `file`, limite de tamanho
     inclusivo, gravação local e ausência de caminhos internos na resposta.
   - Listagem e download: contexto `X-User-Id`, isolamento por dono,
     metadados públicos e tratamento de documento ou arquivo inexistente.
   - Interface: chamadas via `/api`, estados de carregamento, sucesso e erro,
     atualização após upload e liberação das URLs temporárias de download.
5. Execute `git diff --check`. Não altere código, instale dependências,
   crie commits ou inicie servidores persistentes como parte desta validação.
   Registre dependências ausentes e outras limitações como bloqueios.

## Resultado esperado

Responda em português com:

- Escopo validado.
- Comandos executados e resultado de cada um.
- Falhas encontradas, com referências aos arquivos relevantes.
- Cenários não verificados e motivo, incluindo eventual ausência de teste
  interativo no navegador.

Não declare uma funcionalidade validada apenas porque o build passou.
Não modifique arquivos para ocultar falhas nem trate verificações não
executadas como aprovadas.
