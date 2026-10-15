> Documento histórico do âmbito anterior. Desde 08/10/2026, a referência ativa é [Plano do proprietário](PLANO-ADMIN-PROPRIETARIO.md). Módulos editoriais e de equipa aqui descritos não são requisitos atuais. Ver [mapa e verificação](MAPA-CODIGO-SEGURANCA.md).

# PMS Casas do Beco — requisitos de operação autónoma

Estado: especificação de trabalho, não funcionalidades já implementadas.
Pesquisa: 5 de outubro de 2026. Fontes e limitações em [PESQUISA.md](PESQUISA.md).
Base existente: [auditoria](../VERIFICACAO-2026-10-05.md), `pms/`, `server/routes/pms/`, `src/pages/CasaDetail.tsx`.

## 1. Compromissos do produto

Decisões expressas pelo proprietário:

- Sistema principal de reservas diretas durante pelo menos 1–2 anos, até futura publicação no Booking/Airbnb.
- Várias casas, com reserva de quartos individuais. Não vender uma casa inteira como unidade sobreposta.
- Administração dentro do site; operação diária sem editar código, ficheiros de configuração ou executar comandos.
- Pagamentos Stripe, incluindo MB WAY; pagamento total ou sinal configurável.
- Português e inglês; identidade visual consistente com o site.
- Desenvolvimento com dados fictícios identificados, reservas reais apenas quando a operação estiver pronta.
- Casa Nascente por configurar: não deduzir quartos/capacidades reais das imagens ou textos do protótipo.
- Uso sensato de tokens: pesquisa concentrada, decisões e resultados persistidos, testes orientados ao risco, sem repetir auditorias integrais em cada edição.

“Autónomo” significa: processar o percurso normal e recuperar falhas previsíveis, com alertas e intervenção humana para exceções. Não significa decidir sozinho litígios, identificar fisicamente hóspedes ou garantir funcionamento durante qualquer falha externa.

As escolhas abaixo são propostas técnicas editáveis, não decisões comerciais tomadas pelo proprietário. O âmbito pode evoluir; os critérios de segurança e consistência não são dispensados para encurtar trabalho.

## 2. Mapa da administração

| Página | Informação e ações essenciais |
| --- | --- |
| Hoje | Entradas/saídas, hóspedes alojados, quartos por preparar, saldos vencidos, mensagens falhadas, pagamentos por verificar e tarefas com prazo. Cada indicador abre a lista correspondente. |
| Calendário | Linhas por quarto agrupadas por casa, dias/semanas/mês, filtros, disponibilidade, reservas, bloqueios, limpeza; abrir detalhe, criar reserva, bloquear período. Mover uma reserva exige pré-visualização de preço e confirmação. |
| Reservas | Pesquisa por referência/nome/contacto/datas, filtros de estadia e pagamento separados, paginação, criação manual, alterações, cancelamento, no-show, check-in/out, exportação autorizada. |
| Detalhe da reserva | Resumo, quartos/noites, hóspedes, conta, pagamentos/reembolsos, comunicações, documentos, tarefas e histórico. Ações disponíveis dependem do estado e da permissão. |
| Casas e quartos | Criação, rascunho, publicação, desativação, capacidade, camas, comodidades, fotografias, textos PT/EN e instruções. Avisar sobre reservas futuras antes de retirar um quarto. |
| Preços e regras | Calendário de preços, épocas/dias da semana, alterações em lote, planos tarifários, mínimos/máximos, antecedência, fechos, cobrança, cancelamento, extras e impostos configuráveis. |
| Hóspedes | Titular da reserva e ocupantes separados, contactos, estadias, dados necessários ao check-in, preferências operacionais e acesso restrito a identificação. |
| Pagamentos | Total contratado, recebido, a cobrar, vencido, a reembolsar, reembolsado, em disputa; movimentos, tentativas, diferenças de reconciliação e comprovativos. |
| Mensagens | Conversa associada à reserva, emails transacionais, mensagens manuais, estado de envio, respostas recebidas quando a integração estiver operacional, modelos PT/EN. |
| Limpeza e manutenção | Tarefas por quarto/data/responsável, sujo/em limpeza/limpo/inspecionado, avarias, prioridade, bloqueio com prazo e motivo. |
| Relatórios | Ocupação, noites, receita de alojamento, recebimentos, dívidas, cancelamentos, reembolsos, ADR/RevPAR e exportação para contabilidade. |
| Configurações | Empresa, estabelecimentos, equipa/permissões, políticas versionadas, integrações, templates, idioma, privacidade, saúde do sistema e histórico. |

## 3. Catálogo mínimo de dados e campos

Obrigatoriedade contextual: não pedir ao hóspede na reserva todos os campos usados posteriormente na faturação ou no check-in.

| Entidade | Campos previstos |
| --- | --- |
| Entidade exploradora | Nome legal/comercial, NIF, morada fiscal, país, contactos, domínio, moeda EUR, fuso Europe/Lisbon, dados de faturação e identificação das integrações. Segredos fora das tabelas de conteúdo e do browser. |
| Estabelecimento/casa | ID estável, nome, slug, morada/código postal/localidade/coordenadas, identificação/estado do registo aplicável, contactos, horários, acessibilidade, estado de publicação e data prevista de abertura. Documentos/seguros com validade e alertas quando aplicável. |
| Quarto físico | Casa, código interno, nome PT/EN, tipo, piso/acesso, capacidade adultos/crianças/bebés e total, camas por tipo, berço/cama extra e limites, WC privativo/partilhado, áreas e comodidades confirmadas, galeria/alt-text, estado comercial e estado de limpeza separados. |
| Conteúdo público | Resumos e descrições PT/EN, fotos autorizadas/ordem, regras da casa, check-in, estacionamento, pequeno-almoço, animais/fumo/festas, contactos e FAQ. Rascunho, pré-visualização, publicação e histórico; sem HTML/scripts livres. |
| Plano tarifário | Nome/código, validade, quartos, preços base ou diários, ocupação incluída, suplementos, faixas etárias, mínimo/máximo de noites, antecedência mínima/máxima, cut-off, dias de entrada/saída, abertura de vendas, política de cancelamento e de cobrança. Precedência das regras explícita. |
| Extras/descontos/taxas | Designação PT/EN, unidade (estadia/noite/pessoa), preço, quantidade, disponibilidade/limite, taxa fiscal aplicável, inclusão no total; desconto com validade/limite/combinabilidade. Taxa turística só após confirmação da aplicabilidade e regra municipal. |
| Reserva | ID interno + referência legível não usada como autorização, origem, criação, titular, idioma, quarto(s), datas/noites/ocupantes, chegada estimada, estado da estadia, versão, termos aceites, instantâneo do preço/regras, pedidos do hóspede e notas internas distintas. |
| Ocupante | Nome, categoria etária quando necessária, ligação à estadia; restantes dados de identificação/nacionalidade/nascimento/residência/documento apenas para finalidade legítima aplicável, recolhidos no momento adequado. Nunca exigir fotografia de documento por defeito. |
| Faturação do cliente | Nome/empresa, identificação fiscal e país quando necessários/solicitados, morada fiscal quando aplicável, email de entrega, referências dos documentos emitidos pelo sistema fiscal escolhido. |
| Conta da reserva | Linhas de alojamento/extras/taxas/descontos/penalizações, quantidade, preço unitário, moeda, arredondamento, total, ajustes com motivo e autor; histórico imutável de documentos finalizados. |
| Cobrança | Tipo (total/sinal/saldo/extra/caução), valor, vencimento, estado, tentativas, método, referência externa, chave de idempotência, expiração, pago em, ligação de pagamento. Nunca PAN/CVC ou códigos MB WAY. |
| Reembolso/disputa | ID próprio e referência do pagamento, montante, motivo, estado real, responsável, pedido/execução/falha, ação seguinte, prazo e evidências minimizadas. |
| Comunicação/tarefa | Reserva, destinatário/responsável, idioma/modelo e versão, execução prevista, estado, tentativas, última falha, referência do fornecedor, conclusão/autor. |
| Auditoria | Ator autenticado, data UTC, ação, entidade, versão, motivo e diferenças relevantes; excluir segredos e conteúdo de identificação desnecessário. |

O modelo deve permitir uma reserva com vários quartos individuais, todos disponíveis, sem criar uma “casa inteira”. Se a primeira interface pública permitir apenas um quarto por compra, isso deve estar explícito; a administração deve poder agrupar estadias relacionadas.

## 4. Regras que não podem depender apenas da interface

### Disponibilidade e alterações

- A base de dados decide a disponibilidade. Confirmar novamente dentro da transação, mesmo que o calendário indique livre.
- Check-out exclusivo: entrada dia 10 e saída dia 12 ocupam as noites 10 e 11. Datas locais; instantes de pagamentos/auditoria guardados com fuso consistente.
- Quarto sem configuração válida, preço ou abertura comercial não se vende. “Em construção”, “fechado” e “esgotado” têm significados diferentes.
- Bloqueios de manutenção, reservas diretas/manuais e agrupamentos usam o mesmo inventário.
- Uma alteração de quarto/datas reserva primeiro o novo conjunto e só liberta o anterior atomicamente; se falhar, a reserva original permanece.
- Alteração paga tem orçamento de diferença, condições, aceitação e cobrança/reembolso próprios. Pagamento falhado não pode destruir a estadia anterior.
- Duas pessoas a editar a mesma reserva recebem aviso de conflito; não há sobrescrita silenciosa.
- Mudanças de preços, taxas, conteúdo ou condições só afetam novas cotações, salvo alteração explícita e auditada de uma reserva.
- Retentativas/double-click/recarregar não podem criar uma segunda reserva ou cobrança. Referência idempotente persistente por operação.

### Estados separados

- Estadia: rascunho/orçamento → opção temporária → confirmada → check-in → check-out; alternativas cancelada/no-show.
- Cobrança: não devida/a vencer/pendente/paga/falhada/ação necessária.
- Reembolso: pedido/pendente/concluído/falhado/cancelado; disputa tem ciclo separado.
- Quarto: comercialmente aberto/fechado; operacionalmente limpo/sujo/avaria.
- Reserva cancelada não equivale a reembolso total. Política pode reter penalização. Inventário e acerto financeiro são tratados separadamente, sem esquecer a dívida ao hóspede.
- No-show e saída antecipada têm regras explícitas. Não marcar automaticamente uma pessoa como tendo chegado apenas porque pagou.

### Pagamentos

- Total ou sinal fixo/percentual + saldo com vencimento configurável. Reservas perto da chegada podem exigir pagamento total, conforme regra publicada.
- MB WAY: pagamento iniciado/autorizado pelo cliente; saldo através de novo pedido/ligação. Não prometer débito automático nem pré-autorização de caução neste método. [Stripe MB WAY](https://docs.stripe.com/payments/mb-way)
- Cartão guardado e cobrança posterior apenas com consentimento e fluxo suportado; falha/autenticação adicional encaminha para pagamento pelo hóspede.
- Multibanco tem confirmação potencialmente demorada; só ativar depois de existir regra própria para prazo de pagamento, inventário e chegada próxima. Não reutilizar o prazo curto de um Checkout de cartão. [Stripe Multibanco](https://docs.stripe.com/payments/multibanco)
- Registos de transferência/numerário, se ativados, identificam quem verificou a receção; introduzir uma nota não equivale a dinheiro recebido automaticamente.
- Caução de danos é distinta de sinal da estadia e não conta como receita de alojamento. Métodos/prazos/autorizações suportados têm de ser verificados antes de ativar.
- Reembolsos individuais com estado, incluindo falha/cancelamento posterior; não assumir que um total acumulado nunca pode precisar de correção. [Stripe reembolsos](https://docs.stripe.com/refunds)
- Webhook assinado + processamento idempotente + consulta periódica ao fornecedor para reconciliar falhas. Página “sucesso” não prova pagamento.
- Nunca libertar uma opção apenas pelo relógio se houver pagamento possivelmente em curso. Verificar e expirar no fornecedor; pagamentos tardios entram em revisão sem criar sobreposição.
- Saldo cobrado, taxas do fornecedor, receita e transferência para o banco são valores diferentes.

### Automação com recuperação

Processos persistentes fora do browser: reconciliar pagamentos, expirar opções seguras, cobrar/notificar saldos, confirmar reservas, enviar instruções, criar limpeza e alertar prazos.

Cada tarefa tem chave única, tentativas com espera progressiva, estado, erro, limite, alerta e reexecução segura. A confirmação da reserva e a criação da mensagem a enviar ficam na mesma transação. Uma falha de email não anula um pagamento nem oculta a reserva. Reiniciar o servidor não perde tarefas.

## 5. Administração, proteção e continuidade

- Área `/admin` e respetivas APIs protegidas no servidor. Esconder botões ou usar `noindex` não protege dados.
- Autenticação mantida e compatível com a stack; segundo fator para contas administrativas, recuperação segura, sessões revogáveis, limitação de tentativas e reautenticação em ações sensíveis. Não criar conta/palavra-passe predefinida.
- Perfis iniciais: proprietário (inclui equipa/integrações), gestão (operação conforme permissão), limpeza (tarefas/quarto, sem documentos nem valores) e consulta/contabilidade (só dados necessários).
- Cookies de sessão protegidos, expiração/inatividade, CSRF, validação da origem, autorização por objeto e limitação persistente de pedidos. Controlo em cada leitura/escrita, incluindo exportações.
- Segredos em ambiente/gestor de segredos. No painel, apenas estado da integração e identificadores não secretos; ativação/desativação comercial pode ser editável.
- Upload de imagens limitado por tipo/tamanho, ficheiros privados com acesso temporário, sem nomes de hóspedes em URLs públicas. Remover metadados desnecessários.
- Política de retenção por categoria/finalidade, acesso/exportação/retificação e eliminação quando legalmente possível; documentos fiscais/obrigações não se apagam indiscriminadamente. [Princípios RGPD](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en)
- Backups automáticos protegidos e fora do servidor principal; recuperação ensaiada. Proposta técnica a validar com alojamento/custos: perda máxima de 15 minutos e recuperação em 4 horas. Não são garantias já disponíveis.
- Monitorização de base/worker/Stripe/email, notificações de falhas, manual de operação degradada, pausa de novas vendas sem perder reservas, estratégia de atualização e reversão.
- Testes e produção separados, com dados fictícios e credenciais próprias. Sem pagamentos reais por defeito.

## 6. Portugal: integrações e validações necessárias

Estas são exigências a investigar e suportar no produto; não substituem confirmação do enquadramento concreto com contabilista e entidades competentes.

- Configuração do titular e registo do estabelecimento; confirmar modelo de exploração/venda de quartos e dados efetivos antes da publicação.
- Faturação através de solução adequada ao enquadramento português. Recibo Stripe não deve ser apresentado como prova de que as obrigações fiscais estão cumpridas. Prever adiantamentos, fatura final, recibos, notas de crédito, reenvio e reconciliação; integração certificada quando aplicável. [AT](https://info.portaldasfinancas.gov.pt/pt/apoio_ao_contribuinte/Cidadaos/Atividade_profissional/Fatura_e_recibo/Paginas/default.aspx)
- SIBA: informação dos ocupantes abrangidos, registo de entradas/saídas, validação, envio ou exportação, aceitação/rejeição e reenvio. FAQ atual indica três dias úteis para comunicação de entrada e de saída de cidadãos estrangeiros; calcular calendário aplicável e manter comprovativo. Automação depende de acesso e modo de comunicação habilitado. [SIBA FAQ](https://siba.ssi.gov.pt/ajuda/perguntas-frequentes/)
- Os campos de identificação previstos no manual incluem nome, nascimento, nacionalidade, residência, documento e país emissor, entrada/saída. Validar formato técnico em vigor antes de desenvolver integração; não exigir tudo no checkout. [Manual SIBA](https://siba.ssi.gov.pt/files/SIBA_Manual_de_Utilizador_v1.4.pdf)
- Termos, cancelamento, privacidade, identificação pública e Livro de Reclamações; preparar campos e links editáveis. [Turismo de Portugal](https://business.turismodeportugal.pt/pt/Planear_Iniciar/recursos-apoio/Paginas/livro-de-reclamacoes-eletronico.aspx)
- Taxa turística de Idanha-a-Nova: não foi confirmada uma regra municipal aplicável nesta pesquisa. Não inventar taxa nem concluir que está isento. Manter desativada até validação.
- Confirmar outras obrigações de reporte aplicáveis ao tipo/capacidade da operação, incluindo estatística, antes do lançamento; não presumir que SIBA cobre todas.

## 7. Direção visual e interação

Referências funcionais: calendário e ficha operacional de Cloudbeds/Mews; conversa ligada à reserva de Lodgify. Adotar padrões de trabalho, sem copiar layouts, marcas ou código. [Fontes](PESQUISA.md)

Proposta coerente com o site existente:

- Logótipo atual, Playfair Display nos títulos e Lato nos controlos, sem redesenhar a marca.
- Navegação castanho profundo `#0a0604`/`#2c1d11`, destaque areia `#d4b098`, área de trabalho clara e quente `#f6f2ed`, texto escuro. O fundo claro é uma proposta para facilitar leitura prolongada das grelhas.
- Navegação lateral em desktop, barra compacta no telemóvel; filtros persistentes e pesquisa visível.
- “Hoje” orientado às ações urgentes; calendário por casa/quarto; detalhe em painel ou página que preserve os filtros de origem.
- Texto normal de 14–16 px; valores alinhados; datas inequívocas, montantes em euros e conteúdo PT/EN. Evitar o texto minúsculo e espaçamento excessivo do site editorial nas tabelas.
- Cores de estado acompanhadas por palavra/ícone. Não depender só de verde/vermelho. Objetivo WCAG 2.2 AA, foco visível, teclado e alternativa ao arrastar. [W3C](https://www.w3.org/WAI/WCAG22/quickref/)
- Transições discretas de 120–180 ms, respeito por redução de movimento; sem vídeo de fundo, parallax ou ecrãs de espera artificiais na administração.
- Guardar com feedback claro, aviso de alterações por guardar, estado vazio explicativo, erro recuperável e confirmação específica para cancelar, reembolsar ou publicar.
- Pré-visualização “antes/depois” em alterações de preço/datas e operações em lote. Um botão indisponível explica o motivo.
- Conteúdo operacional frequente editável no painel. Regras técnicas de integridade, código e segredos não se tornam texto livre editável.

## 8. Relatórios e definições

- Receita de alojamento por data de estadia separada dos recebimentos por data de pagamento.
- Noites disponíveis excluem períodos fora de venda segundo regra explícita; mostrar também noites bloqueadas para não esconder falta de disponibilidade.
- Ocupação = noites ocupadas / noites disponíveis. ADR = receita de alojamento / noites vendidas. RevPAR = receita de alojamento / noites disponíveis. Definir base fiscal, gratuitas, cancelamentos e no-show, com consistência entre períodos.
- Relatórios por casa/quarto/período, saldos vencidos, penalizações, reembolsos, extras e reconciliação com Stripe/contabilidade.
- Exportação CSV protegida e segura contra fórmulas, valores/formato documentados; sem recolher dados pessoais para relatórios que não os necessitam.

## 9. Arquitetura e sustentabilidade propostas

Direção atual: React/Vite + Node.js + PostgreSQL + Stripe; ver relatório de 14/10/2026. Backend comum para o motor público e o painel; evitar duas implementações diferentes da disponibilidade/preço.

Um serviço Node para o site/APIs e um processo de tarefas persistentes, inicialmente com fila em PostgreSQL. Não adicionar microserviços, Redis ou uma nova stack sem necessidade demonstrada. A escolha do alojamento continua pendente.

Evoluir o modelo com migrações versionadas: equipa/sessões, configurações/publicações, reserva principal + estadias por quarto, ocupantes, planos tarifários, linhas da conta, cobranças e tentativas, reembolsos individuais, disputas, mensagens/tarefas, documentos e reconciliação. Migrar dados existentes com verificação de contagens, montantes e inventário.

Referências externas e exportações estáveis permitem futura migração ou ligação a um channel manager. Não prometer integração direta imediata com Booking/Airbnb: Booking exige onboarding específico para parceiros. [Booking Connectivity](https://developers.booking.com/connectivity/docs)

## 10. Implementação e conclusão verificável

Consultar [ENTREGAS.md](ENTREGAS.md). Não usar percentagens subjetivas de “PMS pronto”. Cada entrega deve declarar: implementado, testado localmente, validado com fornecedor ou pendente.

Dados reais e decisões ainda necessários, sem bloquear desenvolvimento com exemplos: identificação fiscal/registo, configuração dos quartos, horários, regras de cobrança/cancelamento, serviços/taxas, equipa, domínio/email, conta Stripe e fornecedor de faturação/alojamento.

Esta especificação não altera esses valores nem ativa integrações. Atualizar a pesquisa legal/técnica antes do lançamento e quando houver alterações relevantes durante os 1–2 anos de operação.
