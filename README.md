# Casas do Beco

Stack: React 19, TypeScript, Vite/Tailwind/Motion no frontend; servidor HTTP Node.js, PostgreSQL, Better Auth, Stripe e Nodemailer no backend. O mesmo servidor apresenta o site e o admin e encaminha as APIs. O worker do PMS executa separadamente.

## Executar localmente

Requer Node.js 22.14+ e npm. Para o PMS, PostgreSQL local (Docker Desktop em execução se usar o compose).

```bash
npm ci
cp .env.example .env.local
# Configurar o ambiente local sem publicar segredos.
docker compose up -d db
npm run pms:migrate
npm run dev -- --port 3004
```

Se `.env.local` já existir, mantenha-o: não substitua segredos nem configuração existente pelo exemplo. `PUBLIC_SITE_URL` deve ter a origem exata do preview, por exemplo `http://127.0.0.1:3004`. A origem localhost equivalente é aceite na autenticação local. Reinicie depois de alterar variáveis.

`npm run dev` inicia Node e integra o Vite no mesmo processo/porta (3000 por defeito); APIs e páginas usam a mesma origem. Para um preview paralelo use `VITE_CACHE_DIR=node_modules/.vite-test npm run dev -- --port 3104` e um ambiente de teste separado.

## Produção / Railway

```bash
npm run lint
npm run build
npm start
```

Build gera `dist/client/` e `dist/server/index.mjs`. O servidor usa `PORT` do Railway, escuta em `0.0.0.0` por defeito e serve imagens/vídeos existentes nos mesmos endereços. `npm run preview` executa a compilação; `npm run start:local` também carrega explicitamente `.env.local`.

Configure `PUBLIC_SITE_URL=https://casasdobeco.com`, `DATABASE_URL` e segredos no ambiente protegido do alojamento. Só no serviço atrás do HTTP ingress Railway, configure `TRUST_RAILWAY_PROXY=true`: utiliza o `X-Real-IP` fornecido pelo ingress. Por defeito, ignora cabeçalhos de IP enviados pelo cliente e usa o socket. Uma futura migração para outro proxy exige rever esse contrato.

O ficheiro de ambiente é ignorado pelo Git. Nunca incluir credenciais em `VITE_*`: essas variáveis podem ir para o browser. Não publicar chaves, backups, dados de hóspedes ou segredos de segundo fator.

Execute web e `npm run pms:worker` como processos separados supervisionados quando forem necessários. Nesta transição não foram publicados código, domínio ou serviços Railway. Reservas reais permanecem desativadas até ensaios com fornecedor, regras e operação concluídos.

## Contactos

O formulário usa `/api/contact` e só confirma depois da aceitação SMTP. Sem SMTP configurado, apresenta erro e conserva os campos. O destino é `casasdobecoladoeiro@gmail.com`, configurável em `CONTACT_TO_EMAIL`. Para Gmail use uma palavra-passe de aplicação em `SMTP_PASSWORD`.

## Admin e reservas

`/admin` tem Resumo, Calendário mensal/agenda mobile, Reservas e Financeiro. Conta owner única, segundo fator obrigatório, registo público fechado. Configuração física/editorial é manutenção técnica; o proprietário gere estadias, contactos, bloqueios e pedidos financeiros. Criar a primeira conta localmente com `npm run pms:owner`; não existe credencial predefinida.

- `src/`: componentes públicos e admin React.
- `server/`: transporte HTTP, rotas, templates e contactos.
- `pms/`: motor, autenticação, pagamentos, filas, CLI e migrações.
- `scripts/build.mjs`: empacotamento do servidor e cópia dos assets.

Site público continua a renderizar com React no browser; pré-renderização/SEO completo não foi acrescentado nesta mudança. PT/EN público completo, seletor de crianças/bebés, ensaios Stripe sandbox e Telegram/monitorização continuam pendências já identificadas.

## Verificações

```bash
npm run lint
npm run test:contact
npm run test:pms
npm run test:owner
npm run test:admin
npm run test:server
npm run test:admin:postgres
npm run test:pms:postgres
npm run test:owner:postgres
npm run build
```

Testes HTTP e PostgreSQL precisam de sockets locais e DB de desenvolvimento. Suítes de autenticação/owner usam schemas descartáveis; nenhuma credencial real ou segundo fator é alterado. Smoke: `TEST_BASE_URL=http://127.0.0.1:3004 node tests/http-smoke.mjs`, usando a fixture local de Poente/95€ e reservas desativadas.

- [Âmbito do proprietário](docs/pms/PLANO-ADMIN-PROPRIETARIO.md)
- [Mapa de código e segurança](docs/pms/MAPA-CODIGO-SEGURANCA.md)
- [Operação do PMS](pms/README.md)
- [Verificação da transição](docs/VERIFICACAO-2026-10-14.md)
