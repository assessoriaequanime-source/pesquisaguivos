# Dados de deploy na VPS

## Identificação

- Projeto: `pesquisaguivos`
- Domínio público: `https://pesquisa.guivos.com`
- Diretório na VPS: `/opt/pesquisaguivos`
- Branch em uso: `main`

## Portas e isolamento

- App: `127.0.0.1:3091 -> 3000`
- Postgres: interno ao compose, sem porta publicada
- PostgREST: interno ao compose, sem porta publicada
- Kong: interno ao compose, sem porta publicada

## Recursos Docker

- Rede: `pesquisaguivos_default`
- Volume de banco: `pesquisaguivos_pgdata`

## Configuração web

- Nginx responde por `pesquisa.guivos.com`
- HTTP redireciona para HTTPS
- Certificado gerenciado por Certbot

## Validações úteis

```bash
docker compose ps
ss -tulpn | grep -E ':3091|:80|:443'
docker volume ls | grep pesquisaguivos
docker network ls | grep pesquisaguivos
```

## Verificação de dados

```bash
docker compose exec db psql -U postgres -d postgres -c "select count(*) from public.survey_responses;"
docker compose exec db psql -U postgres -d postgres -c "select key, updated_at from public.survey_config order by key;"
```

## Hardening mínimo

- `chmod 600 .env`
- Não publicar portas extras no host
- Não reutilizar diretórios ou volumes de outros projetos
