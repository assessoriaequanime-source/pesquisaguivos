# Deploy — Guivos

Este guia cobre o teste local com Docker e o deploy na VPS Hostinger. Nada aqui foi enviado para a VPS ainda.

O `localStorage` continua sendo a fonte imediata e o Supabase guarda uma cópia real de respostas e conteúdo em segundo plano.

## Arquitetura

- `db`: Postgres.
- `rest`: PostgREST.
- `kong`: gateway da API.
- `app`: aplicação em Node via Nitro `node-server`.
- Sem GoTrue, Storage, Realtime ou Functions.
- RLS ligado sem policies nas tabelas `survey_responses` e `survey_config`.

## Teste local

1. Gere os segredos com `node deploy/generate-keys.mjs`.
2. Crie o `.env` com `cp .env.example .env`.
3. Preencha `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `AUTHENTICATOR_PASSWORD` e `ADMIN_PASSWORD`.
4. Suba com `docker compose up --build`.
5. Valide em [localhost:3000](http://localhost:3000), [localhost:3000/admin](http://localhost:3000/admin) e [localhost:8000](http://localhost:8000).

## VPS

- Domínio: `pesquisa.guivos.com`.
- Diretório: `/opt/pesquisaguivos`.
- Projeto Docker fixo: `pesquisaguivos`.
- Porta pública: `APP_PORT=3090` em `127.0.0.1`.
- Kong, Postgres e PostgREST não expõem portas.

Passos: clone o repositório em `/opt`, gere os segredos, suba com `docker compose up -d --build`, aponte o Nginx para `http://127.0.0.1:3090`, rode `nginx -t`, `systemctl reload nginx` e `certbot --nginx -d pesquisa.guivos.com`.

## Validação

- [pesquisa.guivos.com](https://pesquisa.guivos.com)
- [pesquisa.guivos.com/admin](https://pesquisa.guivos.com/admin)
- Conferir o volume `pesquisaguivos_pgdata`.
