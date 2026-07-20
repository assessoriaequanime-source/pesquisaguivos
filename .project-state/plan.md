# Plano

Painel do gestor com editor completo (perguntas + páginas), com ocultar/remover/inserir, drag-and-drop, troca de tipo de pergunta, formatação e renumeração automática. Depois, revisar responsividade.

## Alterações

### 1) `src/lib/survey-store.ts` — modelo e helpers

- Adicionar em `Question`: `hidden?: boolean`, `titleStyle?: 'display' | 'section' | 'quote'`, `frame?: 'plain' | 'card' | 'accent'`.
- Novo `PageContent` (intro/proposal/done: eyebrow, título, parágrafos, exemplos) com `getContent()`, `saveContent()`, `resetContent()`.
- Helpers: `addQuestion(type)`, `removeQuestion(id)`, `moveQuestion(from, to)`, `addOption(qid)`, `removeOption(qid, code)`, `moveOption(qid, from, to)`, `changeQuestionType(qid, newType)`.
- `code` do option deixa de ser identidade visual — a numeração exibida ao usuário vem da posição do item visível (`01`, `02`, ...); mas `code` interno permanece para preservar respostas antigas.

### 2) `src/routes/index.tsx` — consumir novo modelo

- Filtrar `hidden` e recomputar índice/`display code` a partir da posição.
- Ler `PageContent` para Intro, Proposal e Done (com fallback para conteúdo atual).
- Aplicar `titleStyle`/`frame` ao renderizar o título da pergunta.
- Manter Q19 → contato usando um flag `contactTrigger` na opção; migrar padrão para as duas primeiras opções da pergunta identificada como "intenção" (por id). Para não quebrar, manter fallback ao id 19.

### 3) `src/routes/admin.tsx` — editor completo

Nova aba **Textos** para editar cópia das páginas (intro/proposta/final).
Aba **Perguntas** reformulada:

- Botão "Adicionar pergunta" (escolhe tipo).
- Cada linha exibe: handle de arraste, número de exibição (só se visível), botões Ocultar/Exibir, Duplicar, Excluir.
- Painel de edição por pergunta:
  - Título, helper, obrigatório/oculto.
  - Selector de tipo (single / multi / scale / open) com conversão preservando dados quando possível.
  - `titleStyle` (Display / Seção / Citação) e `frame` (Plano / Card / Destaque).
  - Editor de opções com drag-and-drop nativo, adicionar/remover, editar rótulo.
  - Campos específicos por tipo (min/max labels, placeholder, multiline, dropdown, max multi).
- Drag-and-drop de perguntas (HTML5 nativo, sem dependências novas).
- Botão "Salvar alterações" único.

### 4) Responsividade

Revisão em `index.tsx` (Intro, Proposal, Question) e `admin.tsx` (tabs, header, tabela de respostas → cards no mobile, editor):

- Padding e tamanhos com breakpoints `sm:` `md:`.
- Handles e botões com hit-area ≥ 40px em mobile.
- Tabela de respostas colapsa em cards abaixo de `md:`.

## Considerações

- Sem novas dependências (drag-and-drop nativo).
- Dados persistidos em `localStorage` (já é o caso).
- Compatibilidade: perguntas antigas sem os campos novos assumem padrões (`hidden=false`, `titleStyle='display'`, `frame='plain'`).
