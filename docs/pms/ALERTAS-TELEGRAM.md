# Alertas — preparação e futura ativação

## Implementado agora

A migração 011 cria `alert_events`. Triggers registam criação/mudança de estado de reservas, pagamentos, pedidos financeiros e emails, na mesma transação da operação. Rollback não deixa aviso falso; update sem mudança de estado não duplica evento. Cada evento guarda tipo, referência e estado; não guarda nome/email/telefone/documentos, chaves ou payloads do fornecedor.

O worker existente faz limpeza dos eventos com mais de 30 dias, sem processo adicional. Nenhuma mensagem Telegram é enviada nesta entrega; não há bot, webhook Telegram, IA, SDK ou consulta periódica ao Telegram. A fila é uma base de integração, não uma garantia de entrega já existente.

`/healthz` verifica a versão do esquema e o heartbeat do worker; falha devolve 503 com mensagem genérica. Um serviço desligado ou uma base inacessível não conseguem registar a sua própria falha na base: será necessário um monitor externo quando ativarmos os avisos. O healthcheck de deploy do Railway não substitui essa monitorização contínua.

## O que Eduardo precisa de fornecer/fazer depois

1. Criar um bot no **@BotFather** oficial do Telegram, com `/newbot`; escolher nome e username terminado em `bot`.
2. Guardar o token diretamente nas variáveis protegidas do serviço Railway como `TELEGRAM_BOT_TOKEN`. Não enviar no chat nem guardar no Git, em screenshots ou em variáveis `VITE_*`. Se exposto, revogar no BotFather.
3. Criar um grupo privado só com Eduardo, o cliente e o bot. Não é necessário dar ao bot permissões de administrador nem desativar a privacidade de mensagens para apenas enviar alertas.
4. Adicionar o bot ao grupo e enviar `/start@username_do_bot` no grupo. Confirmar o grupo de destino. O número de telefone não identifica o chat e não é necessário para esta integração.
5. Obter/validar uma única vez o ID desse grupo pela API do próprio bot, sem partilhar logs com mensagens pessoais. Guardar como `TELEGRAM_CHAT_ID`. Se usarem tópicos, indicar também o tópico/`message_thread_id` pretendido. Nunca escolher automaticamente um grupo só por ser o último update.
6. Confirmar alertas desejados: reserva confirmada, cancelamento/alteração, pagamento confirmado/falhado/em revisão, reembolso e falhas de email/worker/base. Definir quem recebe avisos técnicos e quem recebe avisos operacionais.
7. Aprovar um ensaio claramente identificado e o conteúdo mínimo. Recomendação: referência, estado, data/hora e ligação autenticada ao admin; detalhes de hóspedes continuam só no admin.
8. Escolher/configurar um monitor externo (por exemplo Healthchecks ou equivalente) e a sua integração Telegram para indisponibilidade total. Fornecer a URL de heartbeat protegida por variável, sem a publicar. Definir tolerância a falhas e horário para alertas não críticos.

## Implementação a executar nessa fase

- Consumidor em lotes pequenos no worker atual; ativação explícita, destino fixo validado, sem polling de updates para o funcionamento normal.
- Timeout, tentativas limitadas com espera progressiva, respeito por HTTP 429/`retry_after`, tratamento de bot removido/grupo migrado e estado de entrega no PostgreSQL.
- Controlo de concorrência, agregação de falhas repetidas e proteção contra tempestades de alertas; não reenviar automaticamente o histórico anterior à ativação.
- Reconhecer que uma resposta perdida depois de o Telegram aceitar pode provocar repetição: não prometer entrega exatamente uma vez. Usar referência estável na mensagem.
- Testar reserva, pagamento/reembolso simulado, indisponibilidade, recuperação, reinício e configuração ausente sem enviar dados reais de hóspedes.

## Custos e fontes

O Railway cobra recursos (RAM, CPU, armazenamento e tráfego), não tokens de IA. Reutilizar worker/pool e enviar apenas eventos reduz o trabalho adicional; o custo exato depende do tráfego e do plano. O processo verifica filas a cada 30 segundos e faz limpeza horária. Não acrescentar outro serviço sempre ligado só para o Telegram.

Referências: [preços Railway](https://docs.railway.com/pricing), [Telegram Bot FAQ](https://core.telegram.org/bots/faq), [Bot API](https://core.telegram.org/bots/api), [healthchecks Railway](https://docs.railway.com/deployments/healthchecks).
