# Casa de Vinho — Deploy

## Pré-requisitos
- Node `20.x`
- Banco Postgres (local via Docker ou gerenciado)
- Variáveis de ambiente definidas no provedor (não commitadas)

## Variáveis de ambiente
Copie `.env.example` e preencha em dev. Em produção, defina no painel do provedor:
- `NODE_ENV=production`
- `PORT=8000` (ou a porta do seu serviço)
- `APP_URL=https://seu-dominio.com`
- `STRIPE_SECRET_KEY=<defina_no_provedor>`
- `JWT_SECRET` e `JWT_EXPIRES_IN`
- SMTP (opcional) ou `FAKE_MAIL=true` em dev

## Banco de dados
Há um `docker-compose.yaml` para Postgres local:
```
docker compose up -d
```
Depois rode migrações e seed (opcional):
```
npm run build
npm run migrate:deploy
npm run seed
```

## Início (dev)
```
npm run dev
```
Acesse `http://localhost:8000/pages/index.html`.

## Deploy rápido (Render/Railway)
1. Crie serviço Node e indique `npm run start` como comando.
2. Configure variáveis de ambiente (acima).
3. Configure Postgres gerenciado e a `DATABASE_URL` no `.env` do provedor.
4. Após o primeiro build, execute migrações via job/CLI: `npm run migrate:deploy`.

## Notas Stripe
- Em dev use chaves de teste (formato `sk_test_…`). Live somente em produção (`NODE_ENV=production`).
- Configure `APP_URL` para definir `success_url` e `cancel_url` corretamente.
- Use cartões de teste: `4242 4242 4242 4242`.

## Webhooks (opcional)
Não implementados. Para testar, use `stripe cli` ou `ngrok` com um endpoint dedicado.
