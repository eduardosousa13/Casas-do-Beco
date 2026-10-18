# Emails — configuração e verificação

## Estado da implementação — 18/10/2026

Preparação local na branch `codex/email-delivery`; ainda não publicada nem ligada a uma conta real. Stripe e monitor externo continuam adiados. A conta Resend, autenticação do domínio, chave protegida e receção de emails reais continuam pendentes.

## Fornecedor proposto

Resend via HTTPS, sem novo serviço, worker ou SDK. O worker existente processa as três filas a cada ciclo de aproximadamente 30 segundos. Railway Hobby bloqueia SMTP; não é necessário mudar de plano para usar a API HTTPS. SMTP continua disponível em ambientes compatíveis.

Fontes: [Railway — saída de rede](https://docs.railway.com/networking/outbound-networking), [Resend — planos](https://resend.com/pricing), [domínios](https://resend.com/docs/dashboard/domains/introduction), [idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Contactos guardados

`POST /api/contact` valida os dados, aplica o honeypot/limite de pedidos e guarda a mensagem em `contact_messages`, com migração 014. Só confirma depois do commit. Falha da base devolve erro e mantém os campos no formulário. Mensagem guardada não depende de o fornecedor de email estar disponível.

Campos: ID, data de receção, nome, email, telefone opcional, assunto/casa e mensagem; destino do aviso, estado (`queued`, `sent`, `failed`), tentativas, próxima tentativa e conclusão. A mensagem original mantém-se mesmo se o aviso por email falhar. Não se guardam IP, palavra-passe ou chave API nesta tabela. Não existe endpoint público de consulta. A consulta destas mensagens no painel ainda não foi acrescentada.

O worker envia o aviso para o destino registado no momento da submissão. O remetente é o endereço verificado das Casas do Beco; `Reply-To` é o visitante, para o proprietário responder no seu email habitual. Até cinco tentativas, espera crescente e respeito por `Retry-After`. Falha final gera alerta técnico Telegram sem dados pessoais. Ausência de configuração mantém a fila pendente; o painel já indica a indisponibilidade do serviço de email.

Esta integração guarda mensagens do formulário. Não lê automaticamente a caixa Gmail nem importa respostas a emails. A conservação/eliminação dos contactos deve ser definida com o proprietário antes da abertura comercial; não foi acrescentada eliminação automática sem política aprovada.

## Reservas e recuperação

- Reservas: confirmação, alteração, cancelamento, pedido/confirmação de pagamento e reembolso, com texto PT/EN conforme a reserva.
- Recuperação: fila cifrada, token de uso único com validade de 15 minutos, manutenção do MFA e limpeza do conteúdo após estado final.
- `sent` significa aceite pelo fornecedor, **não entrega comprovada na caixa**. Não há webhook de entrega/bounce nesta implementação.
- Cada tarefa reutiliza a sua chave de idempotência Resend. O fornecedor deduplica durante 24 horas; uma repetição manual depois desse prazo pode enviar novamente. SMTP usa Message-ID estável, sem garantia de deduplicação.
- Reiniciar o worker não perde as filas. Erros do fornecedor não são guardados nem impressos, pois podem conter dados pessoais ou ligações de recuperação.

## Ativação

1. Criar conta gratuita Resend sob controlo do negócio e verificar o email. Não ativar upgrades ou excedentes pagos sem decisão explícita.
2. Adicionar `casasdobeco.com` como domínio de envio e escolher a região de envio disponível apropriada ao projeto.
3. Adicionar no Squarespace apenas os registos de verificação de envio fornecidos pelo painel. Preservar DNSSEC, encaminhamento web, CNAME www e receção de email existente. Não substituir o SPF do domínio raiz sem avaliar os registos atuais.
4. Esperar pela verificação de SPF/DKIM. Usar `Casas do Beco <reservas@casasdobeco.com>` como remetente. O envio não configura automaticamente uma caixa normal para receber respostas nesse endereço.
5. Criar chave Resend apenas de envio e limitada ao domínio, se disponível. Guardar diretamente nas variáveis protegidas do serviço web Railway; nunca no chat, frontend, Git ou documentação.

```dotenv
EMAIL_PROVIDER=resend
EMAIL_FROM=Casas do Beco <reservas@casasdobeco.com>
EMAIL_REPLY_TO=casasdobecoladoeiro@gmail.com
RESEND_API_KEY=<valor protegido>
CONTACT_TO_EMAIL=casasdobecoladoeiro@gmail.com
```

6. Publicar o código com CI aprovado e aplicar a migração 014 pelo pre-deploy existente. Manter uma única instância do worker integrado.
7. Verificar configuração com `node dist/pms/email-cli.mjs --status` no serviço. Não imprime credenciais.
8. Enviar **um** teste autorizado com `node dist/pms/email-cli.mjs --test` e confirmar receção no Gmail, incluindo spam, remetente autenticado e resposta correta. O teste não cria reserva nem altera a conta administrativa.
9. Testar formulário real com mensagem claramente de teste; confirmar registo na base e aviso recebido. Verificar recuperação com conta de teste isolada, sem redefinir a palavra-passe ou alterar o MFA reais. Antes de ativar reservas, ensaiar as mensagens de reservas com destinatários autorizados.

Localmente: `npm run email:status`, `npm run email:test` e `npm run test:email`. O envio de teste usa exclusivamente o destino `CONTACT_TO_EMAIL` configurado.

Verificação local desta preparação: TypeScript e build aprovados; bateria de 82 testes aprovada, mais um teste PostgreSQL adicional de concorrência de contactos aprovado. Testes usam contas/esquemas descartáveis e fornecedor simulado. Diagnóstico compilado confirma que o fornecedor ainda não está configurado. Nenhum email real enviado, nenhum DNS ou segredo de produção alterado.

## Consumo

Sem IA, sem polling do Gmail e sem processo adicional. Uma consulta indexada extra por ciclo quando o email está configurado; chamadas HTTPS apenas para tarefas disponíveis. Cada contacto acrescenta uma linha pequena na base. Este desenho evita um serviço dedicado, mas o consumo real depende do volume e não foi medido em produção.
