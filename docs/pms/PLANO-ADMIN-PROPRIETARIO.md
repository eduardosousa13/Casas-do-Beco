# Admin operacional do proprietário — âmbito ativo

Atualizado em 08/10/2026 após autorização de implementação. Substitui as propostas editoriais/equipa dos documentos anteriores. Eduardo mantém código, conteúdo, estrutura e configuração técnica. O proprietário gere a operação diária. Não transformar este painel num CMS ou num gestor de equipas.

## Implementado

| Área | Comportamento |
|---|---|
| Resumo | Entradas/saídas de hoje, hóspedes alojados, próximas chegadas, reservas recentes e alertas de pagamentos/envios/pedidos com falhas ou revisão. |
| Calendário | Mês geral por casa/quarto, barras contínuas, escolha de mês, navegação e filtro por casa; saída não ocupa noite. Agenda diária no telemóvel. Ficha e bloqueios acessíveis na própria vista. |
| Reservas | Pesquisa por referência/nome/email/telefone, casa, estado da estadia, saldo/revisão/devoluções e período da estadia; paginação. Sem filtro de datas por defeito. |
| Ficha | Datas/quarto/ocupação, titular/contactos/idioma, preço acordado/recebido/saldo, condições preservadas, pedidos do hóspede e notas internas, pagamentos/pedidos/envios/histórico. |
| Operação | Reserva manual sem fingir pagamento ou consentimento online; corrigir contacto/notas, alterar quarto/datas com cotação e confirmação, chegada/saída, cancelar com retenção explícita, bloqueios e desbloqueios. |
| Dinheiro | Pedir saldo por Stripe Checkout e pedir reembolso de pagamento identificado. Resultado pendente até confirmação do fornecedor. Dados de comissões obtidos de Stripe. |
| Comunicações | Filas persistentes PT/EN para confirmação/alteração/cancelamento/pagamento/reembolso; tentativas limitadas e repetir falha pelo painel. Recuperação administrativa cifrada. |
| Financeiro | Contratado das estadias que cruzam o período, bruto recebido por data do pagamento, saldo/acertos dessas estadias, movimentos e exportação CSV. Não confunde pagamento com faturação ou transferência bancária. |
| Acesso | Uma conta owner, palavra-passe e segundo fator; registo público fechado, recuperação, dispositivos/sessões e histórico de segurança. |

A estética segue o site público: fundo castanho escuro, areia, Playfair/Lato, logótipo e fotografias existentes. Dados e estados usam texto além da cor; controlos mantêm foco, modal nativo e adaptação a ecrãs pequenos.

## Retirado do painel

Editores de casas/quartos/descrições/camas/fotografias/comodidades, regras/preços/políticas, configuração técnica e histórico dessa configuração. O endpoint antigo de configuração responde 410 e não executa escritas. Roles manager/cleaner/viewer não autorizam acesso. Dados necessários para validar reservas continuam na base e são mantidos tecnicamente.

Não incluir CRM, housekeeping/equipa, channel manager, portal de hóspedes, cupões, yield, cauções, Multibanco ou carrinho de vários quartos neste âmbito.

## Integridade exigida

- Preços, capacidade e inventário validados no servidor; nenhuma noite sem preço é vendida.
- Chave única por quarto/noite e transações evitam sobreposição; falha na mudança mantém estadia original.
- Revisão da reserva recusa edição sobre dados desatualizados.
- Operações repetidas com a mesma chave e conteúdo devolvem o mesmo resultado. Conteúdo diferente com chave reutilizada é recusado.
- Pedidos de saldo/reembolso não são lançamentos de dinheiro recebido/devolvido.
- Fornecedor valida montante/moeda/associação; duplicados não repetem o pagamento. Resultados duvidosos ficam para revisão, sem libertar noites por suposição.
- Falta de dados não se transforma em zero ou sucesso. Faturação e transferências são indisponíveis, em vez de valores inventados.

## Limites e preparação para abertura

A implementação local não equivale a serviço pronto para produção. Faltam configurar e ensaiar Stripe de teste real (incluindo MB WAY, saldo, devoluções e falhas), SMTP e entrega real, webhooks HTTPS, alojamento e supervisão dos processos. Definir backups/restauro, monitorização e retenção de dados pessoais/emails é responsabilidade da operação técnica antes de publicar.

Preços, quartos finais, políticas válidas, total/sinal e regras comerciais continuam decisões do negócio configuráveis por Eduardo. Casa Nascente permanece por configurar; não se assume inventário a partir das imagens públicas.

Ainda não implementado nesta revisão: seletor público de crianças/bebés, revisão completa do site PT/EN, ficha individual de cada ocupante, referências/documentos fiscais, integração SIBA/fiscal, pagamentos externos/manuais, transferências bancárias Stripe, notificações push, distinção de nova reserva já lida, pesquisa por data de criação/entrada separada e ordenação escolhida pelo utilizador. Alguns eram possibilidades da pesquisa, não requisitos mínimos aprovados. Só recolher documentos/dados adicionais quando finalidade e processo estiverem definidos.

O resumo mostra próximas entradas em sete dias e até oito reservas recentes; alertas até cinquenta; ficha até cem mensagens/eventos recentes. A lista tem quarenta entradas por página. Relatórios limitam cada pedido a um ano; não são contabilidade certificada.

## Referências

A pesquisa funcional está registada em [PESQUISA.md](PESQUISA.md). Padrões usados: ficha única (Cloudbeds), calendário que abre a reserva (Cloudbeds), entradas/saídas como ponto inicial (Mews), leitura clara de saldo e estados do fornecedor (Stripe). Estas referências não autorizam copiar interfaces nem acrescentar módulos fora do âmbito.

Ver [mapa de código e segurança](MAPA-CODIGO-SEGURANCA.md) e [testes da entrega](../VERIFICACAO-2026-10-08.md).
