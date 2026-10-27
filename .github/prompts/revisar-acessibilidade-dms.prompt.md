---
name: revisar-acessibilidade-dms
description: "Revisa a acessibilidade dos componentes React e dos fluxos de upload, listagem e download do DMS."
argument-hint: "Componente ou fluxo a revisar; sem argumento, revisar o diff do frontend"
agent: agent
---

# Revisar acessibilidade do DMS

Faça uma revisão de acessibilidade do escopo informado, sem modificar arquivos.
Na ausência de escopo, revise o diff atual do frontend; se estiver vazio,
peça um componente ou fluxo para revisar.

Siga as [instruções do projeto](../copilot-instructions.md) e os
[requisitos do DMS](../../docs/specs/dms-spec.md).
Use WCAG 2.2 nível AA como referência, sem declarar conformidade integral
com base apenas em inspeção de código ou testes automatizados.

## Verificações

- Prefira HTML semântico e controles nativos. Confira títulos, regiões,
  listas, associação entre rótulos e campos e nomes acessíveis dos botões.
  Recomende ARIA apenas quando a semântica nativa não bastar.
- No upload, confira seleção de arquivo por teclado, instruções associadas,
  estado de envio, prevenção de envio duplicado e preservação da seleção
  quando o upload falhar.
- Na listagem, confira nome, tamanho e data compreensíveis, estados de lista
  vazia e carregamento e atualização após o envio.
- No download, confira nome acessível que identifique o documento, acesso por
  teclado, indicação de progresso e retorno compreensível em caso de erro.
- Nas atualizações assíncronas, confira anúncio de sucesso e erro por
  tecnologias assistivas, sem depender apenas de cor nem mover o foco
  desnecessariamente.
- No CSS, confira indicadores de foco, contraste, tamanho de alvos,
  preferências de movimento e adaptação a telas pequenas e zoom de até 400%.
  Não afirme que o contraste é suficiente sem medir as cores relevantes.

## Evidências e limites

1. Leia os componentes e estilos envolvidos e os testes relacionados.
2. Reutilize as ferramentas já disponíveis. Não instale extensões,
   dependências ou serviços externos para executar a revisão.
3. Quando houver navegador disponível, verifique o fluxo com teclado,
   ordem de tabulação, foco visível, zoom e anúncios dinâmicos.
   Registre o ambiente e os passos efetivamente executados.
4. Se não houver navegador ou leitor de tela, forneça um roteiro manual
   e marque essas verificações como pendentes. Renderização estática
   não comprova interação, foco ou anúncios por leitor de tela.
5. Não invente achados ou critérios WCAG. Relacione cada problema confirmado
   a uma evidência concreta; se não houver problemas confirmados, diga isso
   e preserve as limitações da análise.

## Saída

Responda em português com o escopo e uma tabela:

| Impacto | Arquivo e linha | Problema e evidência | Critério WCAG relacionado | Correção sugerida |
| ------- | --------------- | -------------------- | ------------------------ | ----------------- |

Priorize bloqueios no uso por teclado ou tecnologia assistiva.
Finalize com as verificações executadas e as pendentes, além de um roteiro
curto para reproduzir e validar as correções sugeridas.
Não implemente as correções durante esta revisão.

## Origem e adaptação

Adaptado do agente comunitário
[Accessibility Expert, de github/awesome-copilot](https://github.com/github/awesome-copilot/blob/main/agents/accessibility.agent.md),
consultado em 26/10/2026, sob
[licença MIT](https://github.com/github/awesome-copilot/blob/main/LICENSE).

Foram mantidos os princípios de semântica nativa, teclado e foco, formulários,
anúncios dinâmicos e revisão baseada em evidências. O conteúdo foi reescrito
em português e delimitado aos fluxos do DMS com React/Vite, sem copiar a seleção
de modelo ou a lista extensa de ferramentas do agente original.

### Aviso da licença da fonte

MIT License

Copyright GitHub, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
