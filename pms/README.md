> Estado revisto em 08/10/2026: consultar [implementação e limites](../docs/pms/PLANO-ADMIN-PROPRIETARIO.md) e [mapa de código/segurança](../docs/pms/MAPA-CODIGO-SEGURANCA.md). Dados e conta reais não foram substituídos pelos testes.

# PMS Casas do Beco — fase de desenvolvimento

## Âmbito acordado

Este PMS será o sistema principal de reservas diretas durante pelo menos 1–2 anos. A operação deverá ser feita numa área de administração do próprio site, com automação de reservas, pagamentos e comunicações. A base atual ainda não cumpre todo esse âmbito.

- [Requisitos e direção visual](../docs/pms/REQUISITOS.md)
- [Entregas, lacunas e critérios de conclusão](../docs/pms/ENTREGAS.md)
- [Pesquisa e fontes](../docs/pms/PESQUISA.md)

## Modelo

- Uma **casa** contém zero ou mais **quartos reserváveis**. Cada quarto tem capacidade, número mínimo/máximo de noites e política de pagamento próprios. Não existe venda de casa inteira.
- O dia de saída não é ocupado: uma estadia de 1 a 3 ocupa as noites 1 e 2. Todas as datas são datas locais do alojamento (`Europe/Lisbon`).
- Cada quarto precisa de um preço explícito para **todas** as noites da estadia. Não há preço implícito. Datas sem preço ficam indisponíveis.
- A chave primária `(room_id, stay_date)` em `inventory_nights` impede sobreposição entre reservas e bloqueios manuais, mesmo com pedidos simultâneos. Outro quarto da mesma casa pode ser reservado nas mesmas datas.
- O preço, política e dados do hóspede ficam registados na reserva. Alterar o preço futuro não altera reservas existentes.
- O pagamento é criado no Stripe Checkout. A página de retorno consulta o estado, mas só os **webhooks assinados** confirmam a reserva. Eventos repetidos não duplicam pagamentos. O depósito configurável define o valor inicial; o proprietário pode pedir a cobrança do saldo na ficha. O worker cria a ligação e os webhooks ou a reconciliação autenticada com Stripe confirmam o resultado.
- Uma falha incerta entre o PMS e a Stripe deixa as noites bloqueadas para revisão em vez de as vender duas vezes. `stale-holds` mostra esses casos. Não libertar manualmente sem confirmar o estado na Stripe.

## Arranque local

Requer Node.js 22+, npm, Docker Desktop em execução e uma conta Stripe **de teste** para testar pagamentos.

```bash
npm ci
cp .env.example .env.local
docker compose up -d db
npm run pms:migrate
npm run pms:admin -- init-houses
npm run dev
```

As casas são criadas como rascunhos, sem inventar quartos ou preços. Para fazer uma simulação, adicione um quarto de teste à Poente, ative casa/quarto e defina preços. Substitua o ID abaixo pelo que o comando devolver:

```bash
npm run pms:admin -- add-room poente quarto-teste "Quarto de teste" 2 0 2
npm run pms:admin -- activate-house poente
npm run pms:admin -- activate-room <ID_DO_QUARTO>
npm run pms:admin -- set-rate-range <ID_DO_QUARTO> 2027-06-01 2027-07-01 95.00
```

O ficheiro `dev-policy.example.json` contém **texto de teste**, não condições válidas para clientes. Para exercitar o fluxo local, crie uma política real para o ambiente de teste, ou importe esse exemplo apenas num ambiente descartável:

```bash
npm run pms:admin -- add-policy pms/dev-policy.example.json
npm run pms:admin -- activate-policy development-example-1
```

Para testar o Checkout, preencha `STRIPE_SECRET_KEY` (`sk_test_...`) e `STRIPE_WEBHOOK_SECRET` em `.env.local`, ative MB WAY na conta Stripe de teste e só então mude `BOOKINGS_ENABLED=true`. O webhook é `/api/pms/stripe-webhook`. Configure os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` e `charge.refunded`. Use o [Stripe CLI](https://docs.stripe.com/stripe-cli) para encaminhar eventos ao servidor local. Nunca guarde chaves Stripe no Git. Chaves live exigem `STRIPE_LIVE_ALLOWED=true` e recusam a política de desenvolvimento.

## Operação e comandos

### Estrutura e conteúdo — manutenção técnica

O proprietário não tem editores de casas, quartos, camas, fotografias, preços ou políticas. Eduardo mantém estes dados pelo código e CLI; `configure-file <ficheiro.json>` utiliza as validações transacionais de configuração. Um quarto continua a precisar de capacidade, estado ativo e preços explícitos. Os dados estruturais não foram apagados.

Adultos, crianças e bebés contam para a capacidade. A ficha e reserva manual suportam esses campos. O formulário público ainda necessita do seletor de crianças/bebés e da revisão completa PT/EN.

`npm run pms:admin --` mostra todos os comandos. Os principais:

- `set-room-rules`, `set-payment-policy`, `set-rate` e `set-rate-range` alteram capacidade, estadia mínima/máxima, cobrança e preços.
- `set-rate-closure` impede entradas/saídas num dia; `block` e `unblock` gerem manutenção.
- `reservations` mostra as últimas 100 reservas; `stale-holds` aponta reservas de pagamento que precisam de conferência.
- `cancel-reservation` só liberta noites depois de os pagamentos registados estarem totalmente reembolsados ou conciliados. Reembolsos são feitos na Stripe e atualizados pelo evento `charge.refunded`.
- `check-in` e `check-out` registam o ciclo da estadia.

Para produção, usar PostgreSQL persistente com cópias de segurança testadas, HTTPS, SMTP operacional, monitorização de webhooks e um processo de revisão diária de pagamentos e `stale-holds`. Os comandos de administração são locais e **não** devem ser expostos na web. O painel operacional tem resumo, calendário, reservas e financeiro; faltam configuração/ensaios reais, faturação e política de conservação de dados. Estes pontos, além da configuração real e políticas finais, têm de ser fechados antes de publicar reservas.

## Acesso ao painel inicial

O endereço é `/admin`, com login em `/admin/login`. A autenticação usa [Better Auth](https://better-auth.com/docs) e [segundo fator TOTP](https://better-auth.com/docs/plugins/2fa). Não existe conta ou palavra-passe predefinida nem registo público.

1. Execute `npm run pms:migrate`.
2. Configure `BETTER_AUTH_SECRET` com pelo menos 32 caracteres aleatórios e `PUBLIC_SITE_URL` com a origem exata do preview/site. Gere o segredo com `openssl rand -base64 48`; guarde-o apenas no ambiente protegido. No ambiente local deste projeto já foi gerado sem o colocar no Git.
3. Execute `npm run pms:owner` num terminal interativo. Escolha nome, email e palavra-passe (mínimo 12 caracteres, entrada oculta e confirmação). O comando só cria o primeiro proprietário.
4. Entre no painel e adicione a chave fornecida à aplicação autenticadora como TOTP, 6 dígitos, intervalo de 30 segundos. Confirme um código e guarde os códigos de recuperação num local privado.

Reinicie o servidor quando alterar variáveis. As origens locais `localhost` e `127.0.0.1` são aceites na mesma porta; outras origens não. Fora desses endereços locais, HTTPS é obrigatório. Nunca perder/rodar o segredo sem um procedimento de migração: protege sessões e dados do segundo fator e deve acompanhar o backup protegido da base.

O painel tem Resumo, Calendário, Reservas e Financeiro. Permite consultar fichas, contactos e condições; criar reservas manuais; corrigir contactos/notas; alterar estadias; registar entrada/saída; cancelar com retenção explícita; bloquear/desbloquear datas; pedir saldo/reembolso; consultar emails e repetir falhas. Não é um CMS. A única conta precisa de segundo fator. Operações financeiras dependem de Stripe configurada e do worker.

Em **Histórico** (`/admin/history`), consulte alterações guardadas pelo painel, valores anteriores/novos e eventos de segurança selecionados. Pode filtrar casas/quartos/segurança e navegar para registos antigos. Operações locais antigas que não registaram auditoria não são reconstruídas artificialmente. Em **Sessões da conta** (`/admin/sessions`), consulte os acessos ativos da sua conta e termine outra sessão com confirmação; a atual mantém-se e as de outras contas não são acessíveis. Não são mostrados tokens, chaves ou palavras-passe.

Verificações: `npm run test:admin` (configuração/permissões) e `npm run test:admin:postgres` (autenticação real; apenas PostgreSQL localhost, esquema temporário eliminado no fim). Os códigos de recuperação do segundo fator não substituem a recuperação de uma palavra-passe perdida.

Referências técnicas: [Stripe Checkout](https://docs.stripe.com/payments/checkout), [MB WAY](https://docs.stripe.com/payments/mb-way), [webhooks](https://docs.stripe.com/webhooks), [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

### Recuperar uma palavra-passe perdida

No login, escolha **Esqueci-me da palavra-passe** (`/admin/recover`). O pedido tem resposta genérica para contas ativas existentes/inexistentes; sem SMTP configurado apresenta indisponibilidade antes de procurar a conta. Uma ligação recebida abre `/admin/reset-password`, é de uso único e expira 15 minutos após o pedido. O token viaja no fragmento da ligação, é retirado da barra de endereço depois de carregar e não é enviado ao servidor no pedido da página. O formulário envia-o apenas à API de redefinição.

Depois de alterar a palavra-passe, todas as sessões, dispositivos reconhecidos e ligações de recuperação pendentes da conta são invalidados. O segundo fator e os códigos de recuperação TOTP mantêm-se; voltar a entrar exige o fator ou um código de recuperação válido. O histórico guarda a ação sem palavra-passe/token.

O envio usa a tabela `auth_email_jobs`, com conteúdo cifrado a partir de `BETTER_AUTH_SECRET`, novas tentativas e remoção do conteúdo após envio, falha final, expiração ou cancelamento. O estado `sent` significa aceitação pelo SMTP, não entrega comprovada na caixa de entrada. Uma interrupção depois de enviar e antes de confirmar a transação pode repetir o email, com a mesma ligação e Message-ID. A fila de recuperação permanece cifrada. Emails de reservas têm uma fila separada; cobranças/reembolsos têm pedidos persistentes. O worker operacional processa as três e reconcilia estados com Stripe.

Após preencher as variáveis `SMTP_*` já existentes, execute num processo separado:

```bash
npm run pms:migrate
npm run pms:worker
```

O worker deve acompanhar o processo web no alojamento, com reinício e monitorização. `npm run pms:worker -- --once` executa um ciclo; `pms:mail` permanece como alternativa apenas para email, sem pagamentos. Não o execute com contas reais durante testes de entrega sem autorização para enviar. Guarde o segredo de autenticação com os backups protegidos; é também necessário para ler mensagens pendentes. Verificar tarefas `failed`/`expired` e funcionamento do worker faz parte da configuração operacional, com alerta de serviços indisponíveis no painel.

Testado com SMTP simulado e conta descartável: resposta indistinguível, redirecionamento externo recusado, token inválido/expirado/reutilizado recusado, duas submissões concorrentes só aceites uma vez, palavra-passe antiga recusada, sessões revogadas e segundo fator preservado. Entrega real e supervisão do worker permanecem por validar. No ambiente local atual SMTP não está configurado e o worker não foi iniciado.

### Substituição do segundo fator — procedimento

No painel, abra **Segurança da conta** (`/admin/security`). Com o segundo fator ativo, a página pede a palavra-passe e apresenta **Substituir e gerar nova chave**. A autenticação exige sessão recente e palavra-passe correta. Depois de começar, a chave e os códigos antigos deixam de funcionar. Adicione a nova chave à aplicação, confirme um código e guarde os novos códigos de recuperação. Se interromper o processo, a gestão mantém-se bloqueada até concluir a configuração; pode retomá-la com a palavra-passe na mesma página.

O servidor revoga as outras sessões e dispositivos reconhecidos durante a substituição e na confirmação da nova configuração, incluindo sessões abertas enquanto o segundo fator estava pendente. O histórico regista apenas a ação e o identificador da conta, sem palavras-passe, chaves ou códigos. A página não mostra a chave antiga. Não há opção de deixar permanentemente a gestão sem segundo fator.

Testado com conta fictícia em esquema PostgreSQL descartável: palavra-passe errada preserva o fator; chave e recuperação antigas recusadas; fator novo e novos códigos aceites; outras sessões revogadas. A conta real do proprietário não é alterada pelos testes.
