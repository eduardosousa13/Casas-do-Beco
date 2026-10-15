> Documento histórico do âmbito anterior. Desde 08/10/2026, a referência ativa é [Plano do proprietário](PLANO-ADMIN-PROPRIETARIO.md). Módulos editoriais e de equipa aqui descritos não são requisitos atuais. Ver [mapa e verificação](MAPA-CODIGO-SEGURANCA.md).

# Entregas e critérios de aceitação

Esta lista define trabalho a executar; caixas abertas não são funcionalidades existentes.

## Estado real de partida

| Área | O que existe | O que impede considerá-la concluída |
| --- | --- | --- |
| Casas/quartos | Tabelas e comandos locais; estados draft/active/retired | Administração visual, conteúdos, publicação controlada e configuração real |
| Inventário | Noites exclusivas por quarto, cotação, bloqueios, teste concorrente | Alterações atómicas, opções reconciliadas, reservas manuais completas e agrupamentos |
| Tarifas | Preço por noite e regras básicas | Épocas, alterações em lote, planos, suplementos, descontos, abertura de vendas e impostos |
| Checkout | Preparação de sessão Stripe, sinal percentual/total, comparação da cotação | Chaves/teste real, saldo, retentativa persistente do pedido, métodos adicionais e proteção contra abuso |
| Eventos de pagamento | Assinatura, deduplicação, confirmação e acumulado de reembolsos | Reembolsos individuais, falhados/cancelados, disputas e reconciliação automática |
| Cancelamento | Comando que exige dinheiro integralmente reembolsado/reconciliado | Penalizações legítimas, reembolso parcial, no-show e libertação controlada independente do acerto |
| Hóspedes | Titular com nome/contactos/idioma/notas | Ocupantes, dados por finalidade, check-in online e acesso seguro à reserva |
| Email | Formulário de contacto preparado para SMTP | Email transacional de reservas, fila, estado real de entrega, respostas e recuperação |
| Administração web | Painel inicial de casas/quartos, acesso com segundo fator e API protegida | Completar equipa, recuperação de palavra-passe, fotografias, histórico visível e restantes áreas |
| Operação | Comandos check-in/out e lista de pendências | Limpeza, manutenção, relatórios, alertas, backups/restauro e monitorização |

Os testes locais anteriores são uma base. Não demonstram ainda funcionamento integral com fornecedores ou em produção.

## E1 — Acesso e configuração no painel

Primeiro incremento implementado em 5 de outubro de 2026: login sem registo público, criação inicial do proprietário por terminal com palavra-passe escolhida pelo próprio, TOTP obrigatório para gerir alojamentos, códigos de recuperação de uso único, sessões revogáveis e limites persistidos em PostgreSQL. Perfis owner/manager autorizados; cleaner/viewer e contas desativadas recusados. Painel permite criar/editar casas e quartos, pesquisar, guardar capacidades, horários, textos PT/EN e cobrança, preços simples por período, rascunho/publicação/retirada, conflito de edição e aviso de reservas futuras. Alteração e auditoria ficam na mesma transação.

Verificado: 8 testes de configuração/permissões, ciclo real de autenticação num esquema PostgreSQL descartável, testes anteriores de PMS/contactos/concorrência, compilação e HTTP. No navegador, conta e dados fictícios isolados: login com segundo fator, criação de quarto/preços, publicação e leitura no motor público, reedição sem alterar horários, layout de 390 px sem excesso de largura. Os horários devolvidos pelo PostgreSQL expuseram uma falha corrigida com regressão. O layout do painel foi revisto em desktop e telemóvel; isto não é uma auditoria completa de acessibilidade ou navegadores.

Ainda falta neste bloco: configurar e validar a entrega real da recuperação por email, fotografias/camas/comodidades e restantes campos, definições comerciais completas e ligação do conteúdo PT/EN às páginas públicas. Os textos ficam guardados mas ainda não substituem as descrições estáticas do site. A publicação atual abre o quarto no motor de disponibilidade; não cria automaticamente uma página editorial para uma casa nova. Mantém-se uma única conta administrativa conforme pedido; gestão de equipa não é uma entrega necessária nesta fase. As caixas abaixo continuam abertas por esse motivo.

- [ ] Autenticação, segundo fator, recuperação, revogação e testes de permissões.
- [ ] Estrutura visual, navegação, pesquisa, estados vazios/erro/carregamento e responsividade.
- [ ] Casas, quartos, capacidades, horários, fotografias, textos PT/EN, rascunho e publicação.
- [ ] Configuração comercial editável; credenciais protegidas fora do conteúdo público.
- [ ] Histórico da configuração e aviso sobre reservas futuras.

Incremento seguinte: `/admin/history` permite consultar alterações de casas/quartos e eventos selecionados de segurança, filtrar por tipo, paginar por cursor, comparar campos e consultar os preços anteriores do período. Só são expostos campos autorizados; detalhes brutos de auditoria e segredos não são devolvidos. `/admin/sessions` mostra apenas as sessões ativas da própria conta, identifica a atual e permite revogar outra com confirmação. Não permite revogar a atual nem a de outra conta; a revogação e auditoria são transacionais. Não cria contas adicionais nem altera o segundo fator.

- [x] Consulta visual do histórico de configuração já registado, com paginação e valores antes/depois.
- [x] Consulta das sessões da própria conta e revogação de outra sessão.

Verificação deste incremento: 13 testes locais de administração, ciclo real de autenticação/revogação em esquema PostgreSQL descartável, TypeScript, compilação e smoke HTTP com negação de acesso anónimo/Origem externa. Navegador confirmou as duas páginas com a sessão existente; sessões a 390 px sem excesso de largura. Nenhuma sessão real foi revogada. A recuperação por email permanece pendente; não foi realizado teste de entrega de email ou cobrança.

Aceitação: proprietário cria um quarto de teste no painel; aparece no motor público apenas após publicação e configuração válida. Utilizador anónimo e perfil de limpeza não conseguem ler/escrever dados de administração por URL ou API. Desativar uma conta revoga sessões; recuperar acesso não permite tomada de conta.

Atualização E1 — recuperação de palavra-passe: implementadas páginas de pedido/redefinição com Better Auth, expiração de 15 minutos, consumo único, revogação de sessões/dispositivos/links pendentes e preservação do segundo fator. Fila específica cifrada `auth_email_jobs` e worker `pms:mail` com retentativas, expiração e limpeza do conteúdo. Migração 005 aplicada localmente. A resposta diz que o pedido foi registado; não afirma entrega na caixa. Sem SMTP configurado apresenta indisponibilidade uniforme. Testes de filas (2), restantes testes locais de administração (13), ciclo PostgreSQL real com reset concorrente e TOTP, TypeScript, build e smoke HTTP passaram. Nenhum email real foi enviado ou credencial real alterada. A configuração SMTP, supervisão do worker, alertas visuais e prova de entrega continuam pendentes. Não se considera o bloco nem a automação financeira concluídos.

Atualização E1 — características dos quartos: código interno, tipo, piso, WC privativo/partilhado, tipo de acesso, informação de acessibilidade PT/EN, quantidades de camas/berços e seleção de comodidades confirmadas editáveis no painel. Campos desconhecidos mantêm-se vazios; zero camas é distinto de não configurado. Pedidos antigos que omitem os campos preservam os valores existentes. As alterações aparecem no histórico. Migração 006 aplicada localmente, sem inferir características reais dos alojamentos.

Capacidade de bebés acrescentada à configuração e ao núcleo de cotação/reservas. Todos os hóspedes contam para o total; limites por categoria são verificados no servidor. Reservas existentes continuam com os seus ocupantes e preços. A tarifa continua por quarto/noite, sem suplementos por idade nesta entrega. O formulário público ainda não permite selecionar crianças/bebés; faixas etárias, suplementos e conteúdos públicos ficam pendentes.

Verificado: 17 testes de administração (incluindo preservação/validação dos detalhes e bebés), 11 testes PMS, concorrência PostgreSQL real, TypeScript, build e smoke HTTP. No navegador: campos presentes na edição do quarto existente e largura de 390 px sem excesso. Dados reais não foram editados durante a inspeção. Fotografias, restantes definições comerciais e publicação dos conteúdos não estão concluídas.

## E2 — Calendário, preços e ciclo da reserva


- [ ] Grelha por casa/quarto, filtros e navegação por período.
- [ ] Preços/regras em lote com simulação e precedência explícita.
- [ ] Reserva manual, agrupamento, alteração de quarto/datas e conta discriminada.
- [ ] Políticas versionadas, cancelamento com penalização, no-show, check-in/out e saída antecipada.
- [ ] Conflitos de edição, inventário transacional e operações idempotentes.

Aceitação: duas reservas concorrentes não ocupam as mesmas noites; alteração para quarto ocupado deixa a anterior intacta; datas sem preço não se vendem; mudança tarifária não altera contratos existentes; cancelar não exige devolver uma penalização prevista na política aceite. O fluxo manual aceita uma reserva a receber depois quando autorizado, sem marcar falsamente pagamento.

## E3 — Pagamentos e automações persistentes

- [ ] Cobranças separadas de sinal/saldo/extras, vencimentos, links e retentativas.
- [ ] Checkout cartão/MB WAY em ambiente de teste; métodos desativados claramente identificados.
- [ ] Reembolsos totais/parciais, pendentes/falhados/cancelados; disputas e alertas.
- [ ] Reconciliação periódica e expiração segura de opções.
- [ ] Fila persistente de tarefas, limite de tentativas, reexecução e observabilidade.
- [ ] Registo de pagamentos externos, quando habilitados, com conferência e autor.

Aceitação: pagamento com navegador fechado confirma; duplo clique não cobra duas vezes; timeout recupera a sessão existente; webhook repetido/fora de ordem não duplica movimentos; reembolso falhado não continua como devolução concluída; link antigo não permite pagar um saldo já liquidado; reiniciar o servidor retoma tarefas. MB WAY exige nova autorização do hóspede para o saldo. Reembolsos concorrentes não excedem o valor disponível.

## E4 — Hóspedes, comunicações e operação

- [ ] Área segura da reserva com token expirável/revogável, sem dados pessoais em URLs públicas.
- [ ] Adultos/crianças/bebés e ocupantes; recolha de check-in apenas quando necessária.
- [ ] Modelos PT/EN de confirmação, alteração, saldo, chegada, cancelamento e reembolso.
- [ ] Envios com fila e tentativas; distinguir aceite pelo fornecedor, entregue e devolvido quando o fornecedor disponibilizar esse estado.
- [ ] Mensagens manuais e histórico por reserva; receção de respostas integrada ou fluxo operacional explícito.
- [ ] Limpeza/manutenção, responsáveis, prioridades, prazos e estados.

Aceitação: email falha sem perder reserva, pode ser reexecutado sem duplicar confirmação; mudar a data reagenda mensagens/tarefas; cancelar remove comunicações futuras inadequadas; ligação de outra reserva não revela dados; limpeza vê só informação necessária; o quarto não é marcado como inspecionado por ter terminado uma estadia.

## E5 — Faturação, obrigações, relatórios e continuidade

- [ ] Definir e integrar solução fiscal apropriada; acompanhar emissão/falha/correção e documentos.
- [ ] SIBA conforme modo autorizado: recolha, validação, envio/exportação, resposta, comprovativo e alerta de prazo.
- [ ] Validar registos públicos, reclamações, privacidade, impostos/taxas e obrigações adicionais aplicáveis.
- [ ] Relatórios com definições e reconciliação; exportação completa para futura migração.
- [ ] Backups, ensaio de restauro, monitorização, alertas e instruções para incidentes.
- [ ] Testes de carga e proteção contra abuso proporcionais à operação; revisão das dependências.

Aceitação: emissão fiscal repetida não cria documento duplicado; falha SIBA não fica marcada como comunicação aceite; restauro recupera reservas/pagamentos e concilia eventos ocorridos durante a interrupção; relatórios reconciliam com movimentos e distinguem caução, sinal, receita e recebimento.

## E6 — Ensaio de abertura

- [ ] Percurso completo em desktop e telemóvel, português e inglês.
- [ ] Testes reais no ambiente de teste Stripe para cartão e MB WAY, incluindo autenticação/falha/reembolso.
- [ ] Entrega de email verificada numa caixa autorizada, autenticação do domínio e recuperação de falhas.
- [ ] Operação pelo proprietário apenas com o painel: criar quarto/preço/reserva, bloquear, alterar, cobrar, cancelar, devolver, check-in/out e exportar.
- [ ] Cenários de rede indisponível, base de dados/worker em baixo, eventos atrasados, link expirado, alterações concorrentes e passagem de hora legal.
- [ ] Dados reais revistos, exemplos removidos da publicação, políticas aprovadas e contas de produção configuradas.
- [ ] Procedimento para parar novas reservas e continuar a gerir as existentes.

Só depois destas verificações o PMS pode ser descrito como pronto para operar no âmbito definido. Testar uma página ou ter uma compilação bem-sucedida não substitui o ensaio operacional.

## Decisões para evitar retrabalho

1. Evoluir o modelo financeiro antes de ligar botões de cobrança/reembolso do painel.
2. Utilizar o mesmo serviço de regras no painel e no site público.
3. Desenhar componentes consistentes antes de multiplicar páginas.
4. Entregar uma operação completa e testada de cada vez; não criar botões que pareçam funcionar mas apenas alterem o estado local.
5. Não construir já um channel manager: manter IDs, exportação e espaço para integrações futuras.
6. Datas/regras comerciais provisórias ficam identificadas e editáveis; dados legais não se inventam.
7. Guardar evidência de cada teste e atualizar esta lista; repetir apenas testes afetados e a bateria crítica antes de cada entrega.

### Atualização do acesso — substituição do segundo fator

Implementada a página Segurança da conta para gerar uma nova chave após confirmar a palavra-passe, validar o novo TOTP e guardar novos códigos de recuperação. Sessão recente exigida pela biblioteca; revogação das outras sessões e dispositivos reconhecidos no servidor, incluindo sessões criadas durante a configuração. Regressão de substituição integrada em `test:admin:postgres`, com conta e esquema descartáveis. Isto não altera automaticamente a chave da conta real nem resolve ainda recuperação de palavra-passe por email.
