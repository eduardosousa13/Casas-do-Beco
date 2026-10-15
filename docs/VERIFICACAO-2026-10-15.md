# Verificação de produção — 15/10/2026

## GitHub

- `main` predefinida e protegida, inclusive para administradores: pull request, branch atualizada, conversas resolvidas e check `verify` da aplicação oficial GitHub Actions obrigatório; force push e eliminação recusados.
- Aprovação por outra pessoa não é obrigatória para permitir manutenção por um único responsável.
- Workflow em PR e push na main: Node 22, PostgreSQL 17 descartável, TypeScript, 62 testes e build. Não usa segredos de produção.
- O primeiro CI expôs dependência indevida do teste de concorrência na base local já migrada. Corrigido para schema descartável próprio; CI passou no PR e na main antes do deploy.
- Branches antigas mantidas por escolha expressa do utilizador; nenhum commit ou histórico foi apagado.

## Railway e dados

- Docker multi-stage, runtime sem privilégios e dependências de produção; serviço web/API/admin e worker integrado. Uma réplica, sem auto-sleep; pool máximo de cinco ligações, timeout de ligação/consulta e paragem coordenada.
- Deploy automático da main espera o CI; migrações pré-deploy transacionais com advisory lock; `/healthz` verifica esquema e heartbeat. Falhas devolvem 503 sem divulgar credenciais.
- PostgreSQL persistente, rede privada e TLS com CA validada. Migrações 001–006/009–011 aplicadas. Sem edição de migrações históricas.
- Com autorização explícita, inventário, política e única conta owner foram copiados; conta, hash e dados MFA comparados por igualdade sem os imprimir. Segredo de autenticação preservado. Sessões/verificações/rate limits locais não transferidos. Nenhuma reserva real existia na origem. Base local preservada.
- Contagens transferidas: duas casas, um quarto, trinta tarifas, uma política, uma conta owner/MFA e onze eventos históricos. Nascente continua por configurar. Alojamentos/preços finais permanecem decisão do negócio.

## Ensaios executados

- 62 testes e TypeScript locais; build e CI reais GitHub aprovados. Build Docker e pre-deploy concluídos; healthcheck Railway aprovado.
- Dentro do contentor publicado, HTTP confirmou páginas públicas e retornos de reserva, login, redirecionamento anónimo do admin, recusa de API anónima/Origin estrangeiro, validação de contactos/webhook, quarto/cotação de 190€ na fixture copiada, checkout desativado, intervalo de vídeo 206 e readiness DB/worker.
- O mesmo smoke passou externamente no domínio www com resolução DNS atualizada e validação HTTPS estrita. Não foram criadas reservas/pagamentos/envios reais.
- Durante propagação, alguns resolvedores e o browser integrado ainda devolveram Squarespace/certificado antigo. Esses acessos não contam como prova da aplicação. Não se ignoraram erros de certificado. Um primeiro smoke externo seguiu um redirecionamento para o estacionamento e falhou corretamente no teste de 404; só o ensaio que chegou ao endpoint Railway foi considerado válido.
- Autenticação/MFA foi ensaiada com utilizador fictício em PostgreSQL isolado no CI. Não se introduziu a palavra-passe nem se utilizou o MFA da conta real no navegador de produção; o primeiro login real cabe ao titular.

## Domínio e limites

`www.casasdobeco.com` é o endereço principal, com CNAME/TXT Railway e certificado emitido. DNSSEC continua ativo (checkbox Squarespace e resposta DNS autenticada). O domínio raiz tem encaminhamento 301 para HTTPS www, preservando caminhos. A propagação e caches externos podem demorar; TTL dos registos era 4h, e Squarespace anuncia até 24–48h para encaminhamento.

**Não considerar concluída a abertura comercial:** Stripe sandbox e SMTP/entrega real continuam por configurar/ensaiar conforme combinado; reservas online e Stripe live permanecem desativados. Não houve cobrança, envio real, upgrade de plano ou criação de contas adicionais. Vídeos, PT/EN completo e decisões finais do negócio continuam pendências anteriores.

**Backups:** o plano Hobby recusou backups automáticos de volume (requer Pro). Nenhum agendamento/backup/restauro foi dado como concluído; escolher alternativa e testar recuperação antes de receber reservas reais. Monitorização contínua externa também fica por ativar.

## Alertas

Migração 011 prepara outbox transacional para mudanças de estado de reservas, pagamentos, pedidos financeiros e emails; sem dados pessoais dos hóspedes. Testes confirmam rollback e ausência de eventos duplicados em updates sem mudança de estado. Worker limpa eventos antigos a cada hora (retenção 30 dias). Não há bot/envio Telegram/IA ativo. Falhas totais de DB/aplicação exigem monitor externo; o próprio sistema indisponível não se consegue autoavisar de forma fiável.

Ver [ativação Telegram](pms/ALERTAS-TELEGRAM.md) e [operação Railway](DEPLOY-RAILWAY.md).
