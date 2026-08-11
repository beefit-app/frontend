# BeeFit Guidelines

Diretrizes para manter consistência de produto, UI e implementação nas próximas mudanças.

## Objetivo do produto

- O BeeFit deve parecer um app real de treino com identidade própria, não um protótipo genérico.
- Toda nova tela precisa conversar com o restante do app em visual, navegação e comportamento.
- O foco é fluxo mobile-first, com cards bem definidos, ações claras e navegação simples.
- O app mistura treino, perfil e feed social. As funcionalidades devem refletir esse contexto.

## Como implementar mudanças

- Não criar soluções paralelas quando já existe um padrão visual ou de fluxo no projeto.
- Reaproveitar componentes, estados e comportamentos já existentes antes de inventar novos.
- Preferir mudanças completas de fluxo, não apenas ajustes cosméticos isolados.
- Sempre considerar estados reais do produto: origem da navegação, persistência, retorno correto, defaults e continuidade da sessão.
- Quando o pedido for simples, resolver de forma pragmática, sem overengineering.
- Sempre que possível, modelar dados e callbacks pensando em futura integração com API.
- UI e fluxo devem ser preparados para backend futuro com payloads explícitos, props claras e responsabilidades separadas.

## Expectativa de navegação

- Navegações devem respeitar o contexto de origem. O botão de voltar precisa levar para a tela certa.
- Fluxos importantes não devem ser perdidos ao trocar de aba.
- Se houver sessão ativa, o usuário deve conseguir retornar a ela facilmente.
- A navegação entre treino, perfil e feed deve manter coerência de estado global.
- Se uma tela nasce de outra, a volta deve respeitar esse encadeamento.

## Diretrizes de UX

- Priorizar clareza sobre quantidade de elementos.
- Evitar interfaces poluídas ou com muitas hierarquias concorrendo.
- A ação principal da tela deve ser óbvia.
- Textos de ação devem ser diretos e específicos.
- Ajustes pequenos de posicionamento e comportamento importam tanto quanto a feature em si.
- Quando houver toggle, menu ou drawer, o comportamento deve ser previsível e consistente com o app.

## Estilo visual

- Fundo base do app: `#0A0A0A`.
- Superfícies principais: tons próximos de `#141414`, `#171717`, `#1A1A1A`.
- Bordas padrão: `#2D2D2D` ou variações discretas no mesmo eixo.
- Destaque da marca: amarelo/dourado `#FFD700`.
- Texto principal: `#FFFFFF`.
- Texto secundário: `#A3A3A3`, `#8F8F8F` ou `#737373`.
- Bordas e glow coloridos devem ser usados como acento funcional, não como ruído decorativo.
- Cards devem ter raio grande, normalmente entre `18px` e `24px`.
- Sombras devem ser suaves e profundas, sem exagero.
- O visual deve ser premium, limpo e levemente esportivo.

## Tipografia

- Títulos e números importantes: `Montserrat`.
- Texto de apoio, campos e descrições: `Inter`.
- Títulos costumam ser pesados, com alto contraste e tamanho generoso.
- Labels auxiliares podem usar uppercase com tracking leve.
- O contraste entre título, apoio e metadata deve ser sempre evidente.

## Layout

- Priorizar `flex` e `grid`.
- Evitar posicionamento absoluto, exceto em overlays, badges, ícones flutuantes e detalhes de composição.
- As telas devem respeitar largura móvel próxima de `393px`.
- Espaçamentos devem ser consistentes e respirar; evitar blocos muito comprimidos.
- A composição deve parecer pensada para mobile, não desktop comprimido.

### Responsividade

Convivem dois conjuntos de breakpoints, e eles **não** coincidem (só `768px` é comum):

| Origem | Breakpoints | Onde vale |
| --- | --- | --- |
| Ionic | `576 / 768 / 992 / 1200` | `<IonGrid fixed>`, `.beefit-shell-width`, `.beefit-sheet-width` |
| Tailwind (default) | `640 / 768 / 1024 / 1280` | prefixos `sm:` `md:` `lg:` `xl:` |

Regras:

- **Largura de shell e de overlay** usa as classes `.beefit-*`, ancoradas nos tokens
  `--ion-grid-width-*` de `src/styles/theme.css`. Use `.beefit-shell-width` para o que
  acompanha o conteúdo da página (header, bottom nav) e `.beefit-sheet-width` para bottom
  sheets — esta última é full-width no celular e só cresce a partir de `576px`.
- **Prefixos Tailwind** ficam reservados ao layout *interno* de um componente.
  Não misture os dois para a mesma decisão de largura.
- **Safe area**: consuma `var(--ion-safe-area-top / -bottom / -left / -right, 0px)`, que o
  Ionic já define em `html`. Não use `env(safe-area-inset-*)` direto nem instale plugin.
  O recuo superior é aplicado nos `IonContent` de `App.tsx` e cobre todas as telas.
- **Altura de viewport**: use `dvh`, nunca `vh` nem `min-h-screen` — a barra de URL do
  navegador mobile colapsa e corta o topo de sheets altos.
- **Alvos de toque** devem ter no mínimo `44x44px` de área clicável. Quando o desenho pede
  um ícone menor, expanda a área com um pseudo-elemento em vez de aumentar o elemento.

## Componentes principais

### `PageBackground`

- Deve ser a base das telas principais.
- Manter o mesmo clima visual do app.

### `BeeButton`

- Botão principal do sistema.
- `primary`: ação principal da tela.
- `secondary`: ação secundária com destaque de marca.
- `dark`: ação neutra ou de cancelamento.
- Evitar criar novos botões inline se `BeeButton` resolver o caso.

### `BeeInput`

- Campo padrão para inputs do app.
- Deve ser usado sempre que o caso não exigir algo muito específico.
- Bordas, foco e erro devem seguir o padrão visual existente.

### `BeeCard`

- Wrapper visual para blocos de conteúdo.
- Usar quando a tela pede agrupamento visual consistente com o restante do app.

### `Sheet`

- Usar para menus laterais e ações contextualizadas quando o fluxo pede uma sidebar.
- Deve seguir o padrão já aplicado no perfil.

### `MuscleTag`

- Representa grupos musculares e deve ser reaproveitado sempre que possível.
- As cores dos grupos servem como semântica visual consistente ao longo do app.

## Componentes e padrões do treino

- O treino ativo é um fluxo central do produto e precisa ter tratamento consistente.
- Cronômetro é elemento prioritário da sessão.
- Exercícios adicionados devem aparecer em cards próprios.
- Adicionar exercício deve ser uma ação destacada.
- Detalhes do exercício devem ser reutilizáveis entre catálogo e sessão.
- Templates devem preencher a sessão com dados reais, não apenas texto visual.
- A conclusão do treino deve ser tratada como uma etapa de fluxo, não só um botão solto.
- Informações de conclusão devem ser organizadas em formato fácil de enviar para API depois.

## Estado global e integração futura

- Sempre que um dado impactar mais de uma tela, considerar mover o estado para um nível superior.
- Exemplos de estado global: treino ativo, tempo decorrido, modo fantasma, retorno ao treino.
- Para eventos importantes, preferir callbacks com payload tipado.
- Evitar acoplar decisões de persistência diretamente à UI.
- Quando uma tela emitir dados que depois irão para backend, usar estruturas explícitas e semânticas.

## Mensagens de erro

- **O texto vem de `src/app/constants/messages.ts`**, não escrito à mão na tela. A mesma
  regra tinha textos diferentes por tela antes disso; se a mensagem se repete em mais de
  um lugar, ela pertence ao catálogo.
- Estilo: frase completa, primeira letra maiúscula, **ponto final**, em português, dizendo
  **o que fazer** em vez de só apontar o erro — "Informe um e-mail válido, como
  nome@email.com." e não "E-mail inválido".
- Falha de operação segue a família já consolidada: `Não foi possível <verbo> <objeto>.`
- **Erro de campo** vai no `error` do `BeeInput`, que já cuida da borda vermelha e da
  associação com leitor de tela. **Erro de tela** usa `BeeAlert`.
- **Nunca use `window.alert`, `window.confirm` ou `window.prompt`**: no app empacotado eles
  aparecem com a cara do sistema operacional e ignoram a identidade visual. Use `toast()`
  do sonner para aviso passageiro e `useConfirm` para decisão.
- Cores de estado saem dos tokens `--beefit-danger`, `--beefit-success` e `--beefit-info`
  em `theme.css`. Não repita hex de vermelho na tela.

## Dados locais e segurança

- **Todo dado do usuário guardado no aparelho precisa sair no logout.** O ponto único é
  `clearLocalUserData` (`src/app/services/sessionTeardown.ts`), chamado por
  `clearStoredSession`. Ao criar um cache novo — variável de módulo, chave de storage,
  object URL — acrescente a limpeza dele ali. Vale lembrar que caches de módulo
  sobrevivem ao logout, porque a SPA não recarrega a página.
- `beefit.auth.deviceId` é a única chave que sobrevive de propósito: identifica o
  aparelho, não o usuário, e o backend a usa para vincular o refresh token e limitar
  taxa por device.
- A CSP é injetada no build por `beefitContentSecurityPolicy` em `vite.config.ts`, não
  em `index.html`. Ao adicionar origem externa (fonte, imagem, API), libere a diretiva
  correspondente e **valide com o build servido**: CSP errada não lança erro, só bloqueia
  o recurso e deixa a tela quebrada.
- **`frame-ancestors` não vale por `<meta>`** — o navegador ignora. Precisa ser servido
  como header HTTP por quem hospeda a página; sem isso o app segue enquadrável em iframe.
  Não há config de hospedagem neste repositório, então isso é passo de deploy.

## O que evitar

- Criar soluções visuais que destoem do restante do app.
- Adicionar complexidade estrutural sem necessidade clara.
- Duplicar fluxo ou UI já existente em vez de reutilizar.
- Usar textos vagos, botões genéricos ou navegação que perca contexto.
- Implementar algo só “parecendo pronto” se o comportamento ainda estiver inconsistente.

## Regra prática para futuras tarefas

- Toda mudança deve responder bem a estas perguntas:
- Isso parece BeeFit?
- Isso segue um padrão já usado no app?
- O fluxo faz sentido de ponta a ponta?
- O estado está preparado para crescer e integrar com API?
- O usuário consegue entender e usar sem fricção?
