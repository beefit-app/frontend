# Teste presencial do BeeFit no iPhone

Roteiro da sessao em que os testadores levam o iPhone, o aparelho e plugado no
Mac e o Xcode instala o build nativo. E a unica forma gratuita de colocar um
build iOS nativo no aparelho de outra pessoa: TestFlight e distribuicao Ad Hoc
exigem o Apple Developer Program (US$99/ano).

**O app instalado assim para de abrir em 7 dias.** Avise os testadores; nao e bug.

## Restricao de calendario

O Postgres do Render expira em **18/09/2026** (carencia ate 02/10) e nao tem
backup. Contas criadas na sessao somem depois disso.

## Requisito do Mac — conferir ANTES de qualquer coisa

Nem todo Mac serve, e um Mac velho demais nao e questao de lentidao: e
incompatibilidade que trava na primeira compilacao.

Todos os `Package.swift` do projeto — o de `ios/App/CapApp-SPM/` e os dos seis
plugins em `node_modules/` — declaram `swift-tools-version: 5.9`. Swift 5.9 so
existe a partir do **Xcode 15**, que por sua vez exige **macOS 13.5 (Ventura)**.
Um Mac no Big Sur (macOS 11) para no Xcode 13.2.1 / Swift 5.5 e nao consegue nem
interpretar esses arquivos.

| | Minimo absoluto | Recomendado |
| --- | --- | --- |
| macOS | Ventura 13.5 | Sonoma 14.5+ |
| Xcode | 15 | 16+ |
| Motivo | compilar o projeto | **instalar** em iPhone com iOS recente: Xcode antigo nao reconhece aparelho novo demais |

Na pratica, **Mac de 2018 em diante**. O Ventura exige MacBook Air 2018+,
MacBook Pro 2017+, iMac 2017+ ou Mac mini 2018+. Macs de laboratorio de
faculdade costumam servir e ja vem com Xcode.

Duas saidas que parecem resolver e nao resolvem:

- **OpenCore Legacy Patcher** (macOS novo em Mac sem suporte): funciona, mas nao
  se faz isso em maquina emprestada, e compilar Xcode 16 em hardware de 2014 e
  doloroso mesmo quando da certo.
- **Mac na nuvem** (MacinCloud, MacStadium): nao existe cabo USB ate uma maquina
  remota, e a instalacao presencial depende do cabo. Mac na nuvem so serve para a
  rota TestFlight, que exige os US$99 de qualquer forma.

## Antes da sessao (dias antes, nao no dia)

| # | Passo | Observacao |
| --- | --- | --- |
| 1 | Instalar **Xcode 15+** (16+ de preferencia) | ~15 GB. Baixar no dia mata a sessao. Conferir antes o requisito de macOS acima. |
| 2 | Instalar **Node 22** (ver `.nvmrc`) e **git** | |
| 3 | `git clone https://github.com/beefit-app/frontend.git && cd frontend && npm ci` | |
| 4 | `npm run mobile:sync:remote` | `vite build --mode remote` + `npx cap sync`; ja aponta para `https://beefit-api.onrender.com` |
| 5 | `npx cap open ios` | Capacitor 8 usa **SPM, sem CocoaPods**. A primeira abertura resolve os pacotes pela rede e demora. |
| 6 | *Xcode -> Settings -> Accounts* -> adicionar Apple ID comum | Aparece como **Personal Team** |
| 7 | Target **App** -> *Signing & Capabilities* -> **Team = Personal Team** | Se der `Failed to register bundle identifier`, o `com.beefit.app` esta tomado no cadastro global da Apple: troque `PRODUCT_BUNDLE_IDENTIFIER` para algo unico (ex.: `com.beefit.app.davi`). Nao precisa mexer no `capacitor.config.ts`. |
| 8 | **Ensaio completo no proprio iPhone** | Rodar a instalacao e o roteiro inteiro sozinho. Cada problema resolvido aqui e um problema a menos multiplicado por N aparelhos. |

Nada precisa ser alterado no backend: o CORS de producao **ja libera**
`capacitor://localhost`, a origem do WebView do iOS (conferido no preflight de
`POST /auth/login`).

## No dia — instalacao, por aparelho (~5 min)

Antes de tudo, **acordar o backend**. A instancia hiberna; fria, a primeira
resposta passa de 60 s e o `apiClient` desiste em 15 s, o que parece servidor
fora do ar:

```
curl -m 420 https://beefit-api.onrender.com/actuator/health
```

Requisito do aparelho: **iOS 15+**.

1. Cabo. No iPhone, tocar em **"Confiar neste computador"**.
2. No Xcode, selecionar o aparelho no seletor de destino e dar **Run**.
3. **iOS 16+:** o Run falha pedindo Modo Desenvolvedor. No iPhone:
   *Ajustes -> Privacidade e Seguranca -> Modo Desenvolvedor* -> ligar ->
   **reiniciar** -> repetir o Run. E o passo que mais trava gente.
4. Se a primeira abertura for recusada por certificado: no iPhone,
   *Ajustes -> Geral -> VPN e Gerenciamento de Dispositivo* -> confiar no
   desenvolvedor.
5. Abrir o app e seguir o roteiro abaixo.

## Roteiro de teste

O Android ja foi validado. O que interessa aqui e o que o iOS pode quebrar
sozinho. Anotar o resultado de cada item por aparelho (modelo + versao do iOS).

### Camera e galeria — `src/app/platform/workoutPhoto.ts`

- [ ] Finalizar um treino tirando foto **pela camera**: o pedido de permissao
      aparece com o texto em portugues do `Info.plist`?
- [ ] Idem **pela galeria** (`NSPhotoLibraryUsageDescription`).
- [ ] **Negar** a permissao e tentar de novo: o app se recupera ou trava?
- [ ] A foto sobe e aparece no post do feed.

### Keychain — `src/app/storage/sessionStorage.ts`

- [ ] Logar, **matar o app** (arrastar para cima no seletor) e reabrir:
      continua logado?
- [ ] Logout: a sessao some de verdade (reabrir nao volta logado)?

### Teclado e safe area — `src/app/hooks/useKeyboardState.ts`

- [ ] Login, cadastro e finalizar treino: o teclado do iOS cobre o campo em foco?
- [ ] **Aparelho com notch / Dynamic Island** (o item que ficou pendente na
      auditoria de responsividade): topo, barra de abas e safe area de baixo.
- [ ] O botao de voltar do perfil publico e posicionado em `position: absolute;
      top: 16; left: 16` (`components/profile/components/ProfileView.tsx:57`).
      Conferir se **nao fica sob o notch**.

### Casca nativa

- [ ] Splash screen e icone corretos no springboard (deve ser a abelha, nao o
      quadrado azul do Capacitor).
- [ ] Treino ativo: sair do app, voltar, o treino e retomado.
- [ ] Modo aviao no meio de uma acao: mensagem de erro do proprio app, **sem
      dialogo nativo do sistema**.

### Navegacao

Auditoria estatica feita antes da sessao: **nenhuma tela fica sem saida no iOS.**
`goBack()` (`hooks/useAppNavigation.ts:33`) so e chamado pelo listener
`backButton` (`App.tsx:154`), que e o botao fisico do Android e nunca dispara no
iOS — mas ele so navega entre as **cinco abas**, e a barra de abas esta sempre
visivel. Todas as telas de takeover tem controle proprio de saida:

| Tela | Controle |
| --- | --- |
| Documentos legais | "<- Voltar ao BeeFit" (`LegalDocuments.tsx:243`) |
| Perfil publico | botao no canto superior esquerdo (`ProfileView.tsx:57`) |
| Configuracoes da conta | `onCancel` (`AccountSettingsScreen.tsx:100`) |
| Finalizar treino | `onBack` (`FinishWorkoutView.tsx:97`) |
| Catalogo e detalhe | `onBack` (`WorkoutCatalogView.tsx:95`, `WorkoutCatalogDetailView.tsx:67`) |
| Treino ativo | sai pelas abas; volta pelo banner de treino em andamento (`App.tsx:297`) |

Confirmar no aparelho mesmo assim:

- [ ] De cada tela acima da para sair sem fechar o app.

## Depois da sessao

Consolidar os achados aqui mesmo. Se aparecer bug de plugin nativo, o ciclo de
correcao e `npm run mobile:sync:remote` + Run no Xcode — ou seja, **depende do
Mac de novo, e do aparelho plugado**. Se isso se repetir, os US$99/ano do
TestFlight passam a valer a pena: a atualizacao chega no iPhone dos testadores
sem cabo, e o build vale 90 dias em vez de 7.
