# Roadmap e ponto de restauração

## Estado atual

- Branch: `main`
- Commits relevantes:
  - `6179911` - persistência real via Supabase, infra de deploy e scroll-to-top
  - `8f384aa` - para de versionar `.env`
- Deploy ativo na VPS: `https://pesquisa.guivos.com`
- Stack na VPS: `pesquisaguivos` com `app` em `127.0.0.1:3091`

## Ponto de restauração

Se precisar voltar ao estado validado desta entrega:

1. Faça checkout do commit `8f384aa`.
2. Recrie o `.env` a partir de `.env.example`.
3. Suba a stack com `docker compose up -d --build`.
4. Confirme o domínio `pesquisa.guivos.com` no Nginx.

## Próximos passos recomendados

- Validar resposta nova no formulário e conferir a gravação em `public.survey_responses`.
- Conferir se o painel `/admin` salva e recarrega `questions` e `content`.
- Fazer backup periódico do volume `pesquisaguivos_pgdata`.
- Manter o diretório do projeto isolado de qualquer pasta `guivos` antiga.

## Observação de segurança

- `.env` deve permanecer local e com permissão restrita.
- A exposição pública deve continuar limitada ao Nginx/TLS no domínio.
