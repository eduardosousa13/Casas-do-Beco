> Arquitetura atualizada em 14/10/2026 para React/Vite + servidor Node. Decisões e correções operacionais de 08/10 foram preservadas.

# Mapa de código, retirada de âmbito e segurança

Revisão: 08/10/2026. Mapa do código ativo desta entrega, não certificação de ausência de exploits. Não foram apagadas reservas, conta/MFA, inventário ou histórico do proprietário.

## Caminhos ativos

```text
Site React → servidor Node → /api/pms/{rooms,quote,checkout,status,stripe-webhook}
Admin React (Shell/Owner/Reservation/Activity/Access/Recovery)
  → rotas protegidas no servidor Node → /api/admin/{operations,history,sessions}
  → auth owner+MFA → transação PostgreSQL → motor/inventário/auditoria/filas
Worker Node → filas email/financeiras → SMTP / Stripe → reconciliação PostgreSQL
CLI de Eduardo → configuração validada → casas/quartos/tarifas/políticas
```

| Código/dados | Decisão e motivo |
|---|---|
| `src/admin/Configuration.tsx` | Removido; era CMS/configuração estrutural no painel do cliente. |
| `src/admin/admin.css`, `Shell.tsx`, `Activity.tsx` | Substituídos; tema e navegação operacional coerentes com o público. |
| `src/admin/Owner.tsx`, `Reservation.tsx` | Núcleo novo de resumo/calendário/lista/financeiro e ficha. |
| `server/routes/admin/configuration.ts` | Tombstone 410 para todos os métodos; esconder interface não bastava para impedir escrita pela API. |
| `server/routes/admin/operations.ts`, `pms/owner.ts` | Consultas/ações validadas, sem editar estrutura do site. |
| `pms/configuration.ts`, `room-catalog.ts` | Mantidos: CLI de manutenção e validação de inventário real; usados por testes. Não são APIs públicas. |
| `pms/admin.ts` | CLI técnico; `configure-file` reaproveita validações. Não é controlo concedido ao proprietário pelo browser. |
| `pms/core.ts`, `checkout.ts`, `webhook.ts`, `status.ts` | Mantidos e reforçados: preços/inventário/checkout/assinaturas/idempotência. |
| `pms/auth.ts`, `auth-email.ts`, páginas/API de auth | Mantidos; só owner habilitado autoriza admin. Segundo fator continua obrigatório. |
| `pms/activity.ts`, API history/sessions | Mantidos para segurança; API history força âmbito staff, sem histórico estrutural. |
| `pms/reservation-email.ts`, `payment-worker.ts`, `worker.ts` | Novos: filas persistentes, entrega/retry, pedidos financeiros e reconciliação. |
| `pms/mail-worker.ts` | Mantido como alternativa apenas de email; `pms:worker` é o processo operacional recomendado. Não executar ambos sem necessidade. |
| Migrações 001–006 | Mantidas; esquema e dados que suportam o motor e autenticação. Não editar migração já aplicada. |
| Migrações 009/010 | Novas: operações/revisões/notas/filas/refunds e recuperação de Checkout/limites/heartbeat. |
| Versões 007/008 na base local antiga | Já aplicadas antes desta entrega; não reutilizar os números. Tabelas legadas de fotografias/`admin_operations` não têm consumidores/rotas ativos. Preservadas, sem DROP destrutivo. Base nova aplica os ficheiros existentes 001–006/009/010. Uma limpeza futura requer backup e migração explícita. |
| `@google/genai` | Dependência direta sem imports ativos retirada. |
| `sharp` | Retirada com o framework anterior; não é necessária na stack atual. As imagens públicas existentes foram preservadas sem processamento novo. |
| `source-map-js` | Atualizada por aviso de segurança; versão corrigida em lockfile. |
| `framer-motion` | Fixada como dependência direta na versão já usada (12.43.0), evitando depender acidentalmente da instalação transitiva de `motion`. Animações públicas preservadas. |
| `bun.lock` | Removido por estar desatualizado e não ser o gestor usado; `package-lock.json` é a referência de npm. |
| React/Vite e servidor Node | Entradas públicas/admin separadas. Node serve APIs e protege as páginas admin. Scripts duplicados de comparação retirados; build gera cliente e servidor. |
| Dados/textos públicos `src/` | Mantidos para preservar o preview; apenas chave de repetição no pedido de reserva foi acrescentada ao fluxo público nesta revisão. |

## Problemas identificados e tratamento

| Risco/bug | Tratamento e evidência |
|---|---|
| Configuração acessível por endpoint escondido | API antiga passa a 410 sem chamada ao motor de configuração; smoke e teste API autenticada. |
| Roles adicionais davam acesso a operação | Autorização restringida a owner; teste recusa manager e conta desativada. |
| Duplo envio/criação, resposta perdida do fornecedor | Chaves persistentes, hash do conteúdo, params Stripe imutáveis e recuperação; testes de retries e concorrência PostgreSQL. |
| Falha de autenticação após resposta anterior perdida | Uma recusa posterior não prova que o primeiro pedido não criou pagamento: retry ambíguo entra em revisão e mantém noites; teste checkout. |
| Replay depois de caducar janela de idempotência Stripe | Repetição ambígua após 23h entra em revisão. Não repetir indefinidamente pagamentos antigos. |
| Perder reserva original ao tentar mudar para datas ocupadas | Transação e preview com rollback; teste confirma preservação das noites. |
| Edição antiga sobrescrever mudança recente | Campo revision obrigatório para ações sobre reserva; teste de conflito. |
| Cobrar saldo superior, reembolsar outro pagamento ou acima do disponível | Validação sob lock; pedidos em aberto impedem concorrência financeira; testes. |
| Webhook repetido/quantia diferente/reembolso anterior | Assinatura e associação/moeda/montante; deduplicação e estado review excluído de recebidos; testes. |
| Refund falhado contado como concluído | Reconciliação completa do fornecedor conta apenas succeeded e corrige agregado antigo; teste com fornecedor simulado. |
| Retorno de cobrança de saldo confundia reserva já confirmada com pagamento concluído | Ligação inclui comando opaco; API verifica associação e devolve estado do pedido. Página só confirma esse pagamento quando succeeded; teste de pedido ainda queued. |
| Email de pagamento confirmado dizia pedido de pagamento | Texto distingue existência de ligação (pedido) e confirmação real (sem ligação). |
| Método de pagamento ausente | Reconciliação lê `payment_method_details.type` do fornecedor; não inventa método a partir de configuração. |
| Datas do financeiro ocultavam futuras reservas | Filtros separados na UI; lista sem período por defeito e testes de saldo/futuro. |
| Falta de configuração/worker parecia pronta | Indicadores de serviços por ativar/heartbeat; APIs financeiras recusam serviço indisponível. |
| Exposição de detalhes técnicos/secrets no histórico | Só campos/resumos permitidos; nenhum payload bruto Stripe/auth na ficha. MFA/chaves/env não incluídos em documentos de entrega. |
| CSV executar fórmulas | Prefixo de neutralização para células perigosas; teste. |
| Abuso de criação de holds | Limite persistente HMAC por endereço no checkout, validação Origin e limite/tipo de corpo; servidor valida tudo. |
| Mobile estourava layout de grelha | Tabela com scroll local e agenda diária; DOM verificado a 390px com largura documento=viewport. |
| Dependências com avisos high | Sharp/librsvg GHSA-wq5f-xc86-pv6w e source-map-js GHSA-68fv-2mgg-jv7q corrigidas; npm audit sem avisos após atualização. |

## Limites da revisão

- `npm audit` cobre advisories conhecidos daquela data, não bugs de lógica nem garante segurança total. Não foi um pentest independente.
- Stripe/SMTP foram simulados em testes: falta ensaio real com contas de teste, MB WAY e falhas de rede/restart. Não houve transação nem envio real nesta revisão.
- SMTP pode aceitar email e não o entregar; falha entre envio e commit pode repetir mensagem. Message-ID estável ajuda, não garante entrega exatamente uma vez.
- Processo worker exige supervisão e monitorização. Heartbeat mostra execução recente, não certifica cada fornecedor. Operações com resposta incerta preservam bloqueio/revisão, pedindo intervenção técnica.
- Retenção/anonymização de dados pessoais, backups/restauro, configuração HTTPS/proxy/CSP em produção e gestão de segredos precisam de política e teste de operação. IP deve vir da infraestrutura confiável; não aceitar X-Forwarded-For arbitrário.
- Public rate limiting não substitui proteções de rede, nem cobre todo endpoint público. Limites por IP precisam de validação no alojamento/proxy escolhido.
- Tabelas legadas 007/008 ficam sem consumidores; não há interface pública de upload/fotos/operations antiga. Não apagar por suposição dados de migrações históricas.
- Relatórios são operacionais; fiscalização/SIBA/faturação/transferências não estão integrados. O painel apresenta indisponibilidade explícita.
