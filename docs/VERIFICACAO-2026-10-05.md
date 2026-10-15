> Registo histórico anterior à transição de 14/10/2026. A arquitetura e os comandos atuais estão no README e no relatório dessa transição. Os resultados abaixo referem-se à implementação que existia nessa data.

# Verificação do projeto — 5 de outubro de 2026

## Conclusão

A base implementada passou as verificações abaixo depois de corrigidos problemas reais. Isto não certifica que o PMS esteja completo ou pronto para produção. Não foram efetuados pagamentos, enviados emails externos, feitos commits ou publicado código.

Branch: a branch de trabalho anterior. As alterações de framework anterior, contactos e PMS continuam locais e não commitadas. Esta revisão não voltou a comparar a branch com o GitHub remoto.

## Correções realizadas nesta revisão

- Eventos Stripe repetidos ou fora de ordem deixam de apagar reembolsos ou fazer regredir reservas com check-in/check-out.
- Reembolsos recebidos antes da confirmação ficam registados; o total reembolsado não diminui com notificações antigas. Migração `002_refund_history.sql` aplicada ao PostgreSQL local.
- Pagamentos com montante inesperado são registados para revisão com o montante recebido. Sessões de outras aplicações sem referência local são ignoradas.
- O preço e a forma de cobrança são comparados com a cotação aceite antes de criar o pagamento. Alterações exigem nova consulta.
- Testados erros definitivos e ambíguos da Stripe: libertação das noites apenas quando não há incerteza sobre criação do pagamento.
- Notificações recebidas antes da resposta do Checkout não são sobrescritas por um pagamento pendente.
- Leitura do webhook limitada durante a receção do corpo, antes de o acumular inteiro em memória.
- Respostas atrasadas de consultas são descartadas ao trocar de casa; consentimentos reiniciam com nova cotação; campos e submissões são bloqueados durante pedidos.
- Melhoradas associações dos rótulos do formulário e seleção da capacidade; idioma HTML corrigido para português.
- Página de resultado reconhece reservas já com check-in/check-out.
- Corrigido o arranque de “Onde Estamos”: a mudança de altura após o carregamento podia ocultar todos os painéis da animação. A altura do percurso é agora estável.
- Atualizada `http-cache-semantics`, dependência indireta com vulnerabilidade conhecida. A instalação reportou zero vulnerabilidades após a atualização.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| TypeScript (`npm run lint`) | Passou |
| Contactos (`npm run test:contact`) | 3 testes passaram |
| PMS (`npm run test:pms`) | 11 testes passaram; um exercita 6 cenários de Checkout |
| PostgreSQL real (`npm run test:pms:postgres`) | Passou: só uma de duas reservas simultâneas ocupa o quarto |
| Compilação framework anterior (`npm run build`) | Passou |
| Formatação do diff (`git diff --check`) | Passou |
| Referências estáticas a ficheiros em `/src/assets/` | Nenhum ficheiro em falta detetado |
| Versão compilada via HTTP | 6 páginas principais, 2 páginas de reserva, imagem e vídeo responderam 200; URL inexistente respondeu 404 |
| APIs na versão compilada | Cotação de 190 €, datas inválidas, webhook sem assinatura, referência inválida, Checkout desativado e contacto inválido deram as respostas esperadas |

Os seis primeiros testes de regressão dos webhooks falharam antes das correções e passaram depois. Os testes de Checkout usam um substituto local da Stripe; não validam a conta Stripe, MB WAY ou a entrega real de webhooks.

### Navegador

- Página inicial e navegação para Sobre Nós renderizaram; página inicial sem avisos/erros capturados nessa observação.
- Casa Poente: 10–12 de junho de 2027 → 2 noites / 190 €, claramente identificadas como simulação, sem cobrança.
- Casa Nascente: página renderizada, imagens carregadas e abertura da galeria confirmada.
- Contactos: submissão de dados fictícios apresentou indisponibilidade, sem falso sucesso, porque SMTP não está configurado.
- Onde Estamos: título inicial e abertura do livro confirmados após correção, incluindo largura de 390 px. Na Casa Poente, não foi detetado excesso de largura da página a 390 px.
- Resultado de reserva sem ID: mensagem de referência em falta confirmada.

Não houve comparação visual automatizada com uma captura do preview anterior à migração. Não se garante igualdade de cada frame das animações nem compatibilidade de todos os navegadores.

## Pendências e limites antes de publicar

1. **Stripe/MB WAY e SMTP reais:** credenciais não configuradas; pagamentos desativados. Falta teste completo em ambiente Stripe de teste e teste de entrega de email autorizado.
2. **Vídeos:** o navegador integrado apresentou falha de reprodução do WebM nas casas e do vídeo externo em Onde Estamos. O WebM local existe e é servido com HTTP 200; falta verificar codecs/compatibilidade e preparar alternativa adequada. As imagens de apresentação continuam disponíveis nas casas.
3. **Português e inglês:** os botões de idioma ainda não implementam tradução integral. Existem textos de protótipo que exigem revisão factual.
4. **Conteúdo público:** ligações de termos, privacidade e redes sociais ainda são placeholders; telefone fictício mantido conforme pedido. Descrições de casas inteiras não estão ainda alinhadas com o modelo final de quartos.
5. **Configuração:** Nascente continua por configurar; Poente tem um quarto e preços fictícios de desenvolvimento. Regras, capacidades, preços e textos legais finais por definir.
6. **PMS operacional:** falta painel gráfico, confirmação automática por email, cobrança do saldo após sinal, faturação e reconciliação automática das reservas pendentes. A administração atual é por comandos locais; nem todos os comandos administrativos receberam testes de integração individuais nesta revisão.
7. **Publicação:** falta definir e validar proteção contra abuso do Checkout, operação/monitorização, cópias de segurança e recuperação, conservação de dados e configuração do alojamento. Não foi realizado teste de carga nem auditoria de segurança externa.
8. **Formulário:** a interface atual trata hóspedes como adultos; o núcleo suporta crianças, mas a seleção pública correspondente ainda não está implementada.

## Repetir os testes

`npm run lint`, `npm run test:contact`, `npm run test:pms`, `npm run build`.

Com Docker ligado: `npm run pms:migrate` e `npm run test:pms:postgres`.

`node tests/http-smoke.mjs` testa uma instância compilada em `http://127.0.0.1:3104` (ou `TEST_BASE_URL`). Este teste pressupõe explicitamente os dados locais de desenvolvimento da Poente, preços de 95 €/noite em junho de 2027 e reservas desativadas; não executar contra produção.

## Atualização — navegação do painel para o site

Reproduzida a página vazia ao clicar em “Ver o site” na sessão existente do proprietário. A ligação apontava corretamente para `/`; a ilha React não hidratava porque módulos otimizados de React Router, animações e ícones devolviam HTTP 504 com referências de cache desatualizadas.

Separada a cache framework anterior da cache do preview Vite original e incluídas explicitamente as dependências das duas entradas React na otimização inicial. Acrescentada a opção `VITE_CACHE_DIR` para isolar previews paralelos e compilações de verificação. Reiniciado apenas o servidor local na porta 3004.

Verificado no navegador: recarregar a página inicial e navegar de `/admin` por “Ver o site” renderizam a aplicação; a ilha deixa o estado SSR e contém o conteúdo React. Captura visual confirmou imagem inicial e logótipo. A autenticação existente manteve-se; não foram alteradas credenciais ou segundo fator. TypeScript e compilação framework anterior passaram, esta última com cache isolada.

Esta correção trata o carregamento do preview. Não constitui uma nova verificação integral de pagamentos, animações, vídeos ou de todos os fluxos do PMS. A lista atual das entregas e pendências encontra-se em `docs/pms/ENTREGAS.md`; os pontos anteriores desta auditoria descrevem o estado na altura em que foram testados.
