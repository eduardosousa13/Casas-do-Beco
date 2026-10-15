# Publicação e manutenção — Railway

## Fluxo Git

`main` é a versão publicada. Criar branch temporária `codex/<alteracao>`, fazer commit/push e abrir pull request para `main`. O check **verify** deve passar; a branch tem de estar atualizada e as conversas resolvidas. A proteção aplica-se também a administradores: sem push direto, force push ou eliminação de `main`. Não exige aprovação externa para permitir manutenção por um único responsável. GitHub elimina a branch de um PR depois de merge.

`.github/workflows/ci.yml` executa TypeScript, todos os testes com PostgreSQL descartável e build em PRs e push na main. Não recebe segredos de produção. A configuração Railway deve esperar o CI antes de publicar a main.

## Aplicação

`Dockerfile` faz build com Node 22; imagem final usa dependências de produção e utilizador sem privilégios. O site, APIs/admin e worker correm no mesmo processo; `PMS_WORKER_ENABLED=true` ativa o worker integrado. Não lançar outro `pms:worker` nesse serviço. Sem auto-sleep, uma réplica, pool limitado a cinco ligações. Worker a cada 30s, reconciliação financeira aproximadamente a cada minuto, limpeza horária.

O ficheiro `scripts/railway-service.json` é o conjunto de parâmetros operacionais a aplicar à API `serviceInstanceUpdate` do Railway; não é um `railway.json` nem é lido automaticamente. Contém builder Docker, comando de migração pré-deploy, arranque, `/healthz`, política de reinício e drenagem. Mantê-lo alinhado com as definições do serviço. Falha numa migração impede promover a nova versão. Migrações usam transação e advisory lock; nunca editar SQL já aplicado.

`DATABASE_URL` deve referenciar a variável privada do serviço Postgres: `${{Postgres.DATABASE_URL}}`. Não usar o endpoint público no runtime. `PUBLIC_SITE_URL=https://www.casasdobeco.com`, `NODE_ENV=production`, `TRUST_RAILWAY_PROXY=true` apenas atrás do ingress Railway. O servidor redireciona pedidos GET/HEAD de outros hosts para a origem canónica. Healthcheck não faz esse redirecionamento.

Manter `BETTER_AUTH_SECRET` protegido e estável: cifra também os dados MFA/recuperação. Não gerar outro segredo ao mover uma conta existente. Não copiar sessões/devices de desenvolvimento para produção. Base local mantém-se independente após a transferência; alterações futuras não sincronizam automaticamente.

Reservas online ficam `BOOKINGS_ENABLED=false`; `STRIPE_LIVE_ALLOWED=false`. Sem Stripe sandbox e SMTP configurados/ensaiados não há cobrança, entrega de contactos ou recuperação real por email. O painel indica os serviços indisponíveis. Não apresentar alojamentos/regras de exemplo como inventário comercial aprovado.

## Verificação e recuperação

- `/healthz` devolve 200 apenas com migração 012 e heartbeat recente, quando worker ativado. DB/worker indisponível devolve 503 sem revelar detalhes.
- Verificar `/`, páginas públicas, `/admin/login`, bloqueio anónimo de `/admin` e APIs; testar disponibilidade e valores pela API.
- Validar operações pelo admin autenticado sem alterar credenciais ou segundo fator. Pagamentos requerem ensaio Stripe sandbox separado.
- Confirmar backup automático PostgreSQL no Railway e efetuar ensaio de restauro numa base isolada antes da abertura comercial. Um backup configurado sem restauro testado não é prova de recuperação.
- Rollback de código no Railway só depois de verificar compatibilidade com o esquema atual. Não desfazer migrações destrutivamente. Manter base e segredo de auth em cópias protegidas, com acesso restrito.
- `/healthz` é readiness para deploy. O envio Telegram tem ativação explícita e destino fixo, com outbox persistente no worker atual; ver [alertas](pms/ALERTAS-TELEGRAM.md). Monitor contínuo externo ainda requer configuração independente.

Alojamento funcional não equivale a reservas comerciais prontas: faltam ainda regras/inventário final, textos PT/EN completos, revisão dos vídeos, ensaios Stripe/SMTP e políticas do negócio.


## Estado verificado em 15/10/2026

PR #2 integrado após CI aprovado; main protegida e Railway configurado para aguardar CI. Um serviço Docker Node + worker e um PostgreSQL persistente, com rede privada e certificado CA validado. Esquema 001–006/009–011 aplicado. Transferência autorizada da única conta owner, hash de palavra-passe, MFA cifrado e inventário existente; segredo de autenticação preservado nas variáveis protegidas. Sessões locais excluídas. Base local não foi alterada nem fica sincronizada com produção.

Endereço principal: `https://www.casasdobeco.com`. DNSSEC mantido ativo; CNAME www aponta ao Railway e TXT verifica a propriedade. Squarespace encaminha `casasdobeco.com` por 301 diretamente para HTTPS, mantendo o caminho. Alguns resolvedores ainda podem usar os registos anteriores durante o TTL (4h). A validação com DNS atualizados e TLS estrito confirmou o endpoint Railway; não ignorar avisos de certificado no browser.

**Backups automáticos de volume não foram ativados:** a API do Railway recusou porque exigem plano Pro; o workspace está em Hobby. Não houve upgrade de plano. Antes de aceitar reservas reais, escolher backup cifrado externo ou plano compatível e testar restauro. Não confundir volume persistente com backup.

A imagem inclui `dist/pms/admin.mjs` para manutenção técnica por SSH, sem instalar tsx em produção. Executar `node dist/pms/admin.mjs` mostra os comandos. Bootstrap compilado disponível, mas não executar para substituir a conta existente. O worker standalone compilado existe para outros modos de operação; não o lançar em paralelo com o integrado.

Relatório: [verificação de produção](VERIFICACAO-2026-10-15.md). Alertas: [passos de ativação Telegram](pms/ALERTAS-TELEGRAM.md).
