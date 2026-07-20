# Deploy — Guivos (self-hosted)

Este guia cobre dois momentos: **(A) testar tudo localmente** (Docker, na sua
máquina/dev container) e **(B) deploy na VPS Hostinger** (fase seguinte, só
deve ser executada quando você pedir explicitamente — nada aqui foi enviado
para a VPS ainda).

Nada disso muda a lógica da aplicação: o `localStorage` continua sendo a
fonte de verdade imediata (a UI nunca espera a rede), e o Supabase passa a
guardar uma cópia real de tudo em segundo plano (respostas, perguntas,
conteúdo das páginas).

## Arquitetura

- `db`: Postgres puro (sem a imagem customizada da Supabase — o schema usado
  não depende de nenhuma extensão específica dela).
- `rest`: PostgREST, expõe as tabelas via API REST.
- `kong`: gateway na frente do PostgREST, valida o header `apikey`.
- `app`: a aplicação (build de produção rodando em Node, via Nitro
  `node-server`).
- Sem GoTrue (auth), Storage, Realtime ou Functions — a aplicação não usa
  login de usuário via Supabase Auth (só uma senha de admin validada no
  servidor), então esses serviços foram deixados de fora para reduzir a
  superfície de ataque.
- Segurança: as tabelas `survey_responses` e `survey_config` têm RLS
  habilitado **sem nenhuma policy** — ou seja, ninguém consegue ler/escrever
  usando a chave pública (`anon`/`ANON_KEY`). Só o `service_role` (usado
  exclusivamente dentro das server functions, nunca no navegador) tem acesso,
  via `BYPASSRLS`. As rotas administrativas (salvar perguntas, apagar
  respostas etc.) também exigem a senha de admin no servidor.

## A) Testar localmente com Docker

Pré-requisitos: Docker + Docker Compose instalados, em um terminal que
funcione (não use este chat para rodar os comandos — rode no seu terminal).

1. Gerar os segredos (JWT, chaves, senhas):
   ```bash
   node deploy/generate-keys.mjs
   ```
2. Criar o `.env` a partir do exemplo e colar os valores gerados:
   ```bash
   cp .env.example .env
   ```
   No `.env`, preencha `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`,
   `SERVICE_ROLE_KEY`, `AUTHENTICATOR_PASSWORD` e `ADMIN_PASSWORD` com a saída
   do comando acima. `VITE_SUPABASE_PUBLISHABLE_KEY` e
   `SUPABASE_PUBLISHABLE_KEY` devem repetir o mesmo valor de `ANON_KEY`.
   `SUPABASE_SERVICE_ROLE_KEY` repete o valor de `SERVICE_ROLE_KEY`.
3. Subir tudo:
   ```bash
   docker compose up --build
   ```
4. Verificar:
   - App: http://localhost:3000
   - Gateway Supabase (Kong): http://localhost:8000
   - Faça uma resposta completa na pesquisa e confira em
     `http://localhost:3000/admin` (senha = `ADMIN_PASSWORD` do `.env`) se
     ela aparece na aba "Respostas" — isso confirma que o Postgres recebeu o
     registro (fire-and-forget, pode levar alguns segundos).
5. Para inspecionar o banco diretamente (opcional):
   ```bash
   docker compose exec db psql -U postgres -d postgres -c "select id, submitted_at from survey_responses order by submitted_at desc limit 5;"
   ```

### Ponto de atenção (não testado por mim ainda)

O build de produção depende de `@lovable.dev/vite-tanstack-config`, que por
padrão configura o Nitro com o preset `cloudflare` (voltado à Lovable Cloud).
Criei [nitro.config.ts](nitro.config.ts) + `ENV NITRO_PRESET=node-server` no
[Dockerfile](Dockerfile) para forçar o preset `node-server` (servidor Node
comum) **apenas no build via Docker** — o build feito pela própria Lovable
não é afetado (a variável não existe lá).

Não consegui validar esse build eu mesmo porque o terminal desta sessão está
indisponível (todo comando falha com "Sandbox dependency installation
failed", mesmo `echo`). Ao rodar `docker compose up --build` você vai
descobrir rapidamente se funcionou:
- Se der certo, o container `app` sobe normalmente e responde em
  `localhost:3000`.
- Se o preset não tiver sido respeitado, o build vai gerar uma saída no
  formato Cloudflare Worker (não um `index.mjs` node), e o container `app`
  vai falhar ao iniciar (`node .output/server/index.mjs` não vai existir ou
  vai dar erro). Nesse caso, me avise com o log do build que eu ajusto a
  configuração (provavelmente é só encontrar a chave certa de override no
  pacote `@lovable.dev/vite-tanstack-config`, que só fica disponível depois
  do primeiro `bun install`/`docker build`).

## B) Deploy na VPS Hostinger (só quando você pedir)

Domínio já configurado (DNS apontando para a VPS): `pesquisa.guivos.com`.

**Isolamento nesta VPS**: o servidor já hospeda vários outros projetos em
produção (Typebot, Twenty CRM, Chatwoot, Singulai, GrupoWin etc.), incluindo
um projeto antigo e não relacionado em `/opt/guivos` /
`/opt/guivos-backend-root` (containers `guivos-root-postgres`/
`guivos-root-redis`). **Não tocamos nesses diretórios/containers.** Este
projeto usa:
- Diretório próprio: `/opt/pesquisaguivos` (nome distinto, sem colidir).
- `name: pesquisaguivos` fixo no `docker-compose.yml` → containers/volumes/
  rede sempre prefixados com `pesquisaguivos_`.
- Porta `APP_PORT=3090` (única porta publicada, só em `127.0.0.1`) — livre e
  conferida contra `ss -tulpn` e `docker ps` do servidor. Kong/Postgres/
  PostgREST não publicam porta nenhuma (só acessíveis dentro da rede do
  compose).

Passos:

1. Clonar em um diretório isolado:
   ```bash
   cd /opt
   git clone https://github.com/assessoriaequanime-source/pesquisaguivos.git
   cd pesquisaguivos
   ```
2. Gerar segredos de produção (diferentes dos usados localmente):
   ```bash
   node deploy/generate-keys.mjs
   cp .env.example .env
   # cole os valores gerados no .env; mantenha APP_PORT=3090 (ou outra porta
   # livre, conferida antes com `ss -tulpn`)
   ```
3. Subir a stack:
   ```bash
   docker compose up -d --build
   docker compose ps   # confirmar que os 4 serviços estão healthy/running
   ```
4. Configurar o Nginx (já instalado nativamente no servidor) para o domínio.
   Antes de criar, confira se já não existe um server block para esse
   domínio: `grep -rl "pesquisa.guivos.com" /etc/nginx/sites-enabled/ 2>/dev/null`.
   Se não existir, crie `/etc/nginx/sites-available/pesquisa.guivos.com`:
   ```nginx
   server {
       listen 80;
       server_name pesquisa.guivos.com;

       location / {
           proxy_pass http://127.0.0.1:3090;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   ```bash
   ln -s /etc/nginx/sites-available/pesquisa.guivos.com /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   certbot --nginx -d pesquisa.guivos.com   # TLS (se o certbot já estiver instalado no servidor)
   ```
5. Validar: `https://pesquisa.guivos.com` (site) e
   `https://pesquisa.guivos.com/admin` (login com o `ADMIN_PASSWORD` do
   `.env` — lembre de sincronizar com a constante em `src/routes/admin.tsx`
   se for trocar a senha padrão).
6. Conferir backup do volume `pesquisaguivos_pgdata` (dump periódico do
   Postgres) — igual já deve ser feito nos outros projetos deste servidor.

Não vou rodar nada disso nem fazer push/deploy sem sua confirmação explícita.

