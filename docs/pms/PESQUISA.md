# Pesquisa de referência — PMS Casas do Beco

Consulta em 5 de outubro de 2026. Referências funcionais e técnicas; não se comprou, instalou ou ligou qualquer serviço. Características comerciais dos fornecedores não constituem garantia da nossa implementação. Revalidar documentação na implementação e antes da abertura.

## Referências de produto

| Fonte primária | Observação | Aplicação proposta |
| --- | --- | --- |
| [Cloudbeds PMS](https://www.cloudbeds.com/property-management-system/) | Calendário, gestão de reservas/limpeza, perfis, notas, preços e relatórios integrados | Calendário como centro da operação; detalhe da reserva reúne ações e histórico |
| [Mews Dashboard](https://help.mews.com/s/article/your-dashboard) e [Timeline](https://help.mews.com/s/article/timeline) | Visão de trabalho diário e grelha de estadias/estados | Página Hoje com entradas, saídas e exceções; calendário com estados distintos. Conteúdo parcialmente consultado via índice de pesquisa; página completa da Timeline depende de JavaScript |
| [Lodgify Unified Inbox](https://www.lodgify.com/unified-inbox/) | Conversas associadas à reserva | Histórico de comunicação no detalhe. Não implica integração com mensagens Booking/Airbnb nesta fase |

Inspiração de interação, não reprodução visual. O desenho da marca deriva do projeto atual: `src/index.css`, componentes e contexto fornecido pelo proprietário. Não foi feita uma avaliação prática de contas privadas destes PMS.

## Pagamentos e fiabilidade

| Fonte | Consequência para o projeto |
| --- | --- |
| [Stripe MB WAY](https://docs.stripe.com/payments/mb-way) | Cliente autoriza cada pagamento; sem cobrança recorrente automática ou captura manual; suporta reembolsos e disputas. Saldo terá pedido próprio |
| [Stripe Multibanco](https://docs.stripe.com/payments/multibanco) | Confirmação pode demorar vários dias; exige política de inventário/expiração específica, especialmente para chegadas próximas |
| [Stripe webhooks](https://docs.stripe.com/webhooks) | Assinatura, deduplicação, ordem não garantida e reentregas: processamento transacional e reconciliação |
| [Stripe refunds](https://docs.stripe.com/refunds) | Reembolso pode estar pendente, falhar ou ser cancelado; modelo por reembolso, sem equiparar pedido a devolução concluída |

### Lacunas concretas encontradas na base atual

- `pms/admin.ts`: cancelamento exige devolução integral do dinheiro registado. Impede representar corretamente uma política com penalização não reembolsável; precisa de evolução antes da operação comercial.
- `pms/webhook.ts` e `002_refund_history.sql`: resolvem eventos repetidos/fora de ordem através de acumulados. Ainda não representam todo o ciclo de cada reembolso nem a sua falha/cancelamento posterior. É necessária uma tabela de reembolsos e reconciliação, não apenas mais botões.
- `reservations.stripe_checkout_session_id`: uma sessão por reserva é insuficiente como modelo principal de sinal + saldo + extras + tentativas. Separar obrigações de cobrança, tentativas e pagamentos.
- `reservations.room_id`: serve uma estadia de um quarto. Agrupamentos precisam de uma entidade principal sem retirar a exclusividade do inventário de cada quarto.
- Políticas têm textos versionados, mas cancelamento precisa também de regras estruturadas e calculáveis. Guardar ambos no contrato da reserva.
- Falhas de rede mantêm noites por segurança, mas a recuperação ainda depende de revisão manual; trabalho persistente de reconciliação é requisito de operação autónoma.

Estas lacunas não contradizem os testes que passaram: são cenários e funcionalidades adicionais que ainda não estavam cobertos.

## Segurança, acessibilidade e privacidade

- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): referência para autenticação, segundo fator, recuperação e limitação de tentativas.
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): referência para cookies, duração, renovação e revogação de sessões.
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/): objetivo de acessibilidade; teclado, foco, contraste, mensagens de erro e alternativas a arrastar.
- [Comissão Europeia — princípios RGPD](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en): minimização, finalidade, conservação e segurança. “Todos os campos pertinentes” não significa recolher toda a informação de todas as pessoas antecipadamente.

## Portugal e futura distribuição

- [SIBA FAQ](https://siba.ssi.gov.pt/ajuda/perguntas-frequentes/), [perguntas técnicas](https://siba.ssi.gov.pt/ajuda/perguntas-tecnicas/) e [manual](https://siba.ssi.gov.pt/files/SIBA_Manual_de_Utilizador_v1.4.pdf): obrigações/fluxos, modos de comunicação e campos. O manual é antigo; validar o formato atual e credenciais antes da integração. Há referências antigas a SEF nas páginas técnicas; não assumir que o organismo/contactos antigos continuam a ser o destino correto.
- [AT — fatura e recibo](https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Atividade_profissional/Fatura_e_recibo/Paginas/default.aspx) e [regras de faturação](https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Negocios/Faturacao/Regras_de_faturacao/Paginas/default.aspx): distinguir pagamento, documento fiscal e adiantamento. Definir integração e enquadramento com contabilista.
- [Turismo de Portugal — registo AL](https://business.turismodeportugal.pt/pt/Planear_Iniciar/Licenciamento_Registo_da_Atividade/Alojamento_Local/Paginas/default.aspx) e [Livro de Reclamações](https://business.turismodeportugal.pt/pt/Planear_Iniciar/recursos-apoio/Paginas/livro-de-reclamacoes-eletronico.aspx): dados/registo público e acesso à plataforma de reclamações.
- [Câmara de Idanha-a-Nova — contactos](https://www.cm-idanhanova.pt/contactos.aspx): ponto de confirmação municipal. A pesquisa não estabeleceu a existência/ausência nem valor de taxa turística aplicável.
- [Booking Connectivity](https://developers.booking.com/connectivity/docs): integração depende de requisitos de adesão/parceria. Preparar exportação e IDs; avaliar channel manager quando houver decisão de publicar nos canais. Integração Airbnb não foi validada nesta pesquisa e não é prometida.

## Limites da pesquisa

Recuperação administrativa: revalidada a [documentação Better Auth — email/password](https://better-auth.com/docs/authentication/email-password) e o código instalado da versão 1.7.7 (`api/routes/password.mjs`). Usados os callbacks `sendResetPassword`/`onPasswordReset`, validade configurável e consumo da verificação pela biblioteca. A fila persistente de envio e limpeza das sessões/dispositivos complementam o fluxo; os testes locais não comprovam entrega SMTP real.

Não existe uma lista universal que garanta que “nada falta” para qualquer alojamento. O âmbito documentado cobre a operação descrita, inclui testes de conclusão e explicita decisões em aberto. Credenciais, enquadramento fiscal, quartos reais, regras comerciais, custos de alojamento e acessos institucionais não são inferidos a partir de exemplos de outros PMS.

Não há nesta pesquisa certificação legal, auditoria de segurança independente ou demonstração de produção. A especificação é uma base verificável para construir e validar o sistema ao longo das entregas.
