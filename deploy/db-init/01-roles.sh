#!/bin/bash
# Executado automaticamente pela imagem oficial do Postgres na primeira
# inicialização do volume de dados (docker-entrypoint-initdb.d).
#
# Cria os papéis (roles) que o PostgREST usa para fazer o "role switching"
# a partir do JWT recebido:
#   - anon:          sem nenhum privilégio (deny-all por padrão)
#   - service_role:  BYPASSRLS (usado só pelo backend/server functions)
#   - authenticator: role de login que o PostgREST usa para conectar e trocar
#                    para anon/service_role conforme o "role" do JWT
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  create role anon nologin noinherit;
  create role service_role nologin noinherit bypassrls;
  create role authenticator noinherit login password '${AUTHENTICATOR_PASSWORD}';

  grant anon to authenticator;
  grant service_role to authenticator;

  grant usage on schema public to anon, service_role;

  -- Tabelas já existentes no schema public (se a migração já tiver rodado antes deste script)
  grant select, insert, update, delete on all tables in schema public to service_role;

  -- Tabelas criadas depois (ex.: pela migração 02-survey-schema.sql, executada em seguida)
  alter default privileges in schema public
    grant select, insert, update, delete on tables to service_role;
EOSQL
