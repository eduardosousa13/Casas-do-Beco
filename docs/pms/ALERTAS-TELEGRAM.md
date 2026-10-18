# Alertas Telegram — Casas do Beco

## Destino e privacidade

Bot dedicado `@agentcasasdobecobot`, membro de dois grupos privados: **Axion - DB alerts** para a equipa técnica (Eduardo, João e Yuzzy), partilhado com outros bots/projetos; **Casas-do-Beco** para Eduardo e o cliente, com reservas/pagamentos. Cada mensagem identifica **CASAS DO BECO · PRODUÇÃO** e o canal **TÉCNICO** ou **OPERAÇÕES**. Esta integração acede exclusivamente à base das Casas do Beco. Não acede nem configura a base ou o bot da Axion.

Mensagens incluem tipo, estado, referência UUID, número de evento, hora de Lisboa e ligação à área autenticada. Não incluem nomes, email, telefone, documentos, notas, valores financeiros, credenciais, conteúdo de emails ou erros SQL. Não há comandos de administração pelo Telegram, webhook de entrada, leitura contínua das conversas, IA ou SDK adicional. O token é exclusivamente do servidor; nunca `VITE_*`, Git ou chat.

## Eventos

- Reserva confirmada, alterada (revisão), cancelada, check-in/check-out e pagamento por verificar.
- Pagamento recebido, falhado, em revisão e reembolso total/parcial.
- Operação financeira concluída, falhada ou em revisão.
- Grupo técnico: falha de email da reserva ou falha/expiração do email de acesso.
- Grupo técnico: falhas consecutivas do ciclo de operações/base e recuperação, enquanto o processo está vivo.

Os três primeiros tipos seguem exclusivamente para o grupo operacional do cliente. Filas, leases, cooldown, tentativas e suspensão são independentes por destino; um grupo bloqueado não impede o outro.

Holds/checkout iniciados, estados intermédios e emails enviados não geram mensagens; continuam registados na outbox e são filtrados. Não há pagamentos reais sem a futura configuração Stripe. Alterações de reserva geram aviso quando a revisão é incrementada pelo motor operacional.

## Configuração protegida no Railway

No serviço **Casas-do-Beco**, ambiente de produção:

- `TELEGRAM_BOT_TOKEN`: token BotFather do bot dedicado.
- `TELEGRAM_CHAT_ID`: ID negativo do grupo **Casas-do-Beco**, validado por `getChat` e pela pertença do bot.
- `TELEGRAM_TECH_CHAT_ID`: ID negativo do grupo **Axion - DB alerts**. Se for igual ao operacional, o canal técnico fica inválido para evitar fuga de avisos.
- `TELEGRAM_THREAD_ID` / `TELEGRAM_TECH_THREAD_ID`: opcionais, tópicos aprovados dos respetivos grupos com fóruns.
- `TELEGRAM_ALERTS_FROM`: data ISO UTC explícita de ativação. O histórico anterior é marcado como ignorado, nunca reenviado automaticamente.
- `TELEGRAM_ALERTS_ENABLED=true`: só depois de validar destino e configuração.
- `PUBLIC_SITE_URL=https://www.casasdobeco.com` e `PMS_WORKER_ENABLED=true`, já usados pela aplicação.

Não escolher um grupo por ser simplesmente o último update. Confirmar nome/ID com o utilizador; a descoberta pontual por `getUpdates` não corre no worker normal. Um grupo migrado para supergrupo exige validar e configurar o novo ID: o consumidor não redireciona mensagens automaticamente. Não necessita de permissões de administrador; a privacidade do bot pode manter-se ativa.

## Entrega e consumo

Migrações 011–013: outbox transacional, estados `pending/sending/sent/skipped/dead`, tentativas e leases persistidos. Triggers na mesma transação do negócio: rollback não cria aviso falso; update sem mudança de estado/revisão não cria evento duplicado.

O worker existente, com o mesmo pool, tenta a fila a cada ciclo de aproximadamente 30 segundos. Cada lote reclama até dez eventos e envia uma única mensagem. Lease do canal e dos eventos, cooldown persistido de 30 segundos e `SKIP LOCKED` protegem a concorrência; nenhuma transação fica aberta enquanto se chama o Telegram. A espera de rede está limitada a oito segundos por pedido. Sem filas pendentes há apenas uma leitura indexada por destino: sem escritas nem chamada ao Telegram. O histórico anterior à ativação é marcado como ignorado na primeira passagem com eventos novos.

Tentativas com espera progressiva até uma hora; `429/retry_after` é respeitado, mesmo quando superior a uma hora. Limite de oito tentativas por evento. Falhas definitivas de configuração/permissões/migração suspendem o canal até correção e reset. Uma falha Telegram não interrompe reservas/pagamentos nem faz falhar o healthcheck. Leases expirados recuperam após reinício. Se a resposta se perder depois de o Telegram aceitar, pode haver repetição; usar o evento # para identificar o mesmo aviso. Não se promete entrega exatamente uma vez.

Avisos técnicos: duas falhas consecutivas, sem SQL para o envio, repetição no máximo a cada 30 minutos após entrega, aviso de recuperação. Esta deduplicação técnica é em memória e reinicia com o processo. Eventos finalizados são limpos após 30 dias; pendentes não são apagados pela limpeza. Canal suspenso e eventos esgotados exigem intervenção técnica: não são reenviados automaticamente.

Sem processo ou serviço Railway adicional. O Railway cobra CPU/RAM/armazenamento/tráfego, não tokens de IA; não é possível prometer custo zero. Agrupar eventos e reutilizar worker/pool limita o consumo adicional.

## Operação por SSH

Imagem de produção inclui:

```sh
node dist/pms/alerts-cli.mjs status
node dist/pms/alerts-cli.mjs test operations
node dist/pms/alerts-cli.mjs test technical
node dist/pms/alerts-cli.mjs reset operations
node dist/pms/alerts-cli.mjs reset technical
```

`status` mostra apenas contagens e saúde do canal, nunca o token. `test` coloca um evento **TESTE** na fila real sem criar uma reserva, pagamento ou email. `reset` retoma o canal depois de corrigir acesso/configuração; não reabre automaticamente eventos esgotados. Não executar um segundo worker em paralelo para testar.

## Limite importante: monitor externo

### Pendência adiada por Eduardo — 18/10/2026

**Lembrar ao retomar a preparação da abertura comercial: configurar o monitor externo de uptime e os seus avisos Telegram.** Eduardo decidiu deixar este assunto para depois; não continuar a configuração sem retomar o tema com ele. Os alertas internos do bot continuam separados desta pendência.

- [ ] Escolher o fornecedor e concluir o acesso à conta. O registo HetrixTools não foi conseguido; StatusCake Free foi sugerido como alternativa após pesquisa no Reddit e documentação oficial, mas não foi escolhido/configurado definitivamente. Revalidar plano gratuito, uso comercial e envio para grupo Telegram antes de avançar.
- [ ] Configurar consulta HTTPS a `https://www.casasdobeco.com/healthz`, verificando sucesso HTTP e conteúdo esperado, com tolerância a falhas para evitar alarmes transitórios.
- [ ] Configurar avisos de falha e recuperação apenas para **Axion - DB alerts**, emitidos fora do Railway e sem depender do worker das Casas do Beco.
- [ ] Testar os avisos e a recuperação de forma controlada, sem interromper a base ou reservas de produção; registar evidência e limites do teste.
- [ ] Documentar manutenção da conta/plano, responsáveis e procedimento em caso de falha. Não considerar concluída a monitorização por o Railway mostrar os serviços ativos.

Até retomar: consulta manual de `/healthz`, estados e logs no Railway. Isto não equivale a monitorização automática contínua. Healthchecks.io (sinais enviados pelo worker) foi discutido como alternativa/complemento, mas não foi implementado nem é necessário acrescentá-lo já à solução HTTP escolhida para investigar.

`/healthz` verifica esquema 013 e heartbeat do ciclo de operações. Um processo parado ou um Railway totalmente indisponível não pode enviar o seu próprio aviso. Os avisos técnicos internos conseguem sinalizar DB/ciclo com falhas enquanto o processo e o Telegram têm rede, mas **não substituem um monitor externo**.

Para cobrir a paragem total falta configurar um monitor independente contra `https://www.casasdobeco.com/healthz` com destino Telegram aprovado. A conta/integração desse serviço ainda não foi fornecida. Não há monitor externo ativo nem garantia de aviso para uma indisponibilidade total. O healthcheck Railway é usado para deploy, não substitui esse serviço.

## Verificação

Testes isolados com HTTP Telegram simulado e PostgreSQL real descartável: configuração inválida, privacidade, 429, 401/403, grupo migrado, falhas de rede, histórico filtrado, lotes, cooldown, lease perdido, concorrência de workers, limite de tentativas, suspensão/reset, falha técnica/recuperação, alterações de revisão e isolamento entre grupos operacionais/técnicos. O ensaio em produção usa evento sintético claramente identificado; não simula cobrança real ou uma interrupção da base de produção.

Fontes: [Telegram Bot API](https://core.telegram.org/bots/api), [limites de envio](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this), [preços Railway](https://docs.railway.com/pricing), [healthchecks Railway](https://docs.railway.com/deployments/healthchecks).

### Incremento de emails em preparação — 18/10/2026

Migração 014 acrescenta alerta `contact_email / failed` para o grupo técnico depois de cinco tentativas falhadas do aviso de contacto. Inclui só a referência técnica; nome, email, telefone e mensagem permanecem na base. Novos contactos guardados e envios aceites não geram spam Telegram. Publicação e ensaio real desta alteração ainda pendentes.
