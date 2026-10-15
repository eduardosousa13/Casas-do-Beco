# Verificação da transição — 14/10/2026

## Resultado e âmbito

Frontend React 19/TypeScript/Tailwind/Motion, compilado com Vite. Backend HTTP Node.js com os mesmos handlers Web Request/Response e o mesmo motor PMS PostgreSQL/Better Auth/Stripe/Nodemailer. O framework anterior, adapters, configuração, tipos e cache próprios foram retirados. O histórico e o nome da branch Git foram preservados.

Componentes públicos, animações, estilos e assets não foram redesenhados nesta transição. Admin mantém os componentes operacionais existentes, com nova entrada React e autorização no servidor antes de entregar HTML. APIs mantêm URLs e regras; migrações, inventário real, conta administrativa e segundo fator não foram alterados.

## Mapa da transição

| Responsabilidade | Local atual |
|---|---|
| Servidor/dev com Vite, páginas e encerramento | `server/index.ts` |
| Request/Response, cookies separados, limite de corpo e IP | `server/transport.ts` |
| Rotas API, autorização das páginas e cabeçalhos admin | `server/app.ts`, `server/routes/` |
| Assets, cache, HEAD e pedidos parciais de vídeo | `server/static.ts` |
| Entrada pública React | `index.html`, `src/main.tsx` |
| Entrada admin protegida | `admin.html`, `src/admin/main.tsx` |
| Retornos de pagamento | `server/templates/` |
| Contacto e SMTP | `server/contact.ts`, `server/send-contact.ts` |
| Build cliente/servidor | `vite.config.ts`, `scripts/build.mjs` |
| Regras, filas, pagamentos, autenticação, migrações e CLI | `pms/` — preservados |

## Verificações concluídas

- TypeScript (`npm run lint`), build cliente/servidor e `git diff --check` passaram.
- 60 testes: contactos 3, PMS 12, operações owner 18, admin 17, transporte/ficheiros 7, integrações PostgreSQL 3. As três integrações usam schemas isolados e descartáveis.
- Autenticação passou pelo transporte HTTP real: cookies múltiplos, login, MFA, recuperação, revogação e bloqueios de acesso. A fixture simula explicitamente o cabeçalho IP do proxy confiável; em configuração normal o servidor ignora IPs enviados pelo cliente.
- Transporte: bytes exatos de webhook assinado, alteração de assinatura, excesso de corpo com Content-Length e chunked, HEAD, métodos inválidos, tombstone de configuração, JSON de bootstrap seguro.
- Assets: HTTP 206 e intervalos/sufixos/416 para vídeo; ETag/304, HEAD; recusa de dotfiles, traversal, symlinks fora da raiz e acesso direto ao template admin.
- Smoke HTTP em desenvolvimento e produção: seis páginas públicas, dois retornos de reserva, imagens/vídeo, consulta de quartos/preços, validações, checkout desativado, webhook sem assinatura, contactos inválidos, acesso anónimo e Origin estrangeiro recusados.
- Instalação limpa de produção (`npm ci --omit=dev --ignore-scripts --offline`) em pasta temporária passou; auditoria apresentada pelo npm: zero vulnerabilidades conhecidas. Servidor arrancou com estas dependências e respondeu a páginas públicas/admin, assets e intervalos de vídeo; pedido absoluto de origem estrangeira recusado com 400.
- Navegador: comparação visual da homepage antes/depois; navegação Sobre Nós, Onde Estamos (revelação pelo scroll), Contactos e Casa Nascente. Botão do admin “Ver o site” apresenta a homepage na versão compilada.
- Admin com utilizador fictício e MFA numa base isolada: sessão manteve-se ao trocar dev por produção; resumo, reserva, contacto/valores e financeiro renderizaram; nota foi guardada; bloqueio de noite apareceu no calendário e persistiu depois de recarregar.

## Evidência visual

- `screenshots/site-antes-transicao.jpg`: homepage antes da mudança.
- `screenshots/site-node-preview.jpg`: homepage após a mudança.
- `screenshots/admin-node-producao.jpg`: calendário na compilação de produção com dados fictícios.

A comparação visual é amostral; não certifica igualdade de cada frame em todos os browsers. O código das animações públicas foi preservado. A tentativa de viewport móvel do navegador integrado manteve 1280×720; não conta como novo ensaio real a 390px. A auditoria de 08/10 contém os testes anteriores do layout móvel.

## Pendências preexistentes e limites

O navegador integrado volta a indicar falha de reprodução do WebM local e do vídeo externo de Onde Estamos. Esta limitação já estava documentada em 05/10, antes desta transição. Ficheiro local, URL e entrega HTTP foram preservados; compatibilidade de codecs/browser e fornecedor externo precisam de tratamento próprio.

Stripe/SMTP externos não foram ligados nem usados para pagamentos/envios reais. Testes do fornecedor continuam simulados; ensaio Stripe sandbox fica pendente conforme combinado. Telegram/monitorização, publicação Railway, domínio, backups/restauro e configuração operacional de produção não foram implementados nesta mudança. PT/EN público completo e seletor público de crianças/bebés continuam pendências anteriores.

Os testes não constituem um pentest ou garantia absoluta de ausência de bugs. Os dados e credenciais fictícios, o schema descartável e os servidores auxiliares foram removidos no final. O preview principal permanece na porta 3004. Não houve deploy, push Git, alteração DNS ou mudança de credenciais reais.
