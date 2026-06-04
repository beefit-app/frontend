# Decisoes para App Nativo

## Decisoes Atuais

- O produto final sera um app nativo. A versao web/PWA nao e o alvo final da arquitetura.
- Capacitor ainda nao sera configurado nesta etapa. A integracao nativa fica preparada por abstracoes, sem instalar plugins agora.
- Codigo novo deve preferir APIs assincronas e abstracoes de storage, evitando dependencia direta de `window.localStorage` nos fluxos de produto.
- O rascunho de treino sera salvo por uma camada abstrata de storage com fallback web temporario. A chave segue `beefit.workoutDraft.{userId}.{workoutId}`.
- A foto de treino permanece local como preview por enquanto. Ela nao e enviada ao backend nesta etapa.
- O backend continua sendo a fonte oficial para resumo de treino, incluindo duracao, calorias estimadas e volume total.
- Mocks nao devem mascarar falhas no fluxo real de workout. Catalogo e templates precisam mostrar erro visivel quando a API falhar.

## Storage

A camada `appStorage` expoe `getItem`, `setItem` e `removeItem` como funcoes assincronas. A implementacao inicial usa `localStorage`, mas os consumidores devem depender apenas dessa interface para permitir troca futura por plugin nativo.

O rascunho de treino persiste exercicios, series, pesos, repeticoes, grupos, titulo, opcao de postagem e opcao de salvar como template. Ele e restaurado somente quando `/api/workout/active` confirma o mesmo `workoutId` para o usuario atual.

## Templates

A opcao "Salvar como template" fica na conclusao do treino. Quando ativa, o app usa o titulo do treino como nome do template e chama `POST /api/templates` apos finalizar a sessao. O template salva apenas grupos e exercicios, sem series, pesos ou repeticoes.

## Decisoes Futuras

- Escolher Capacitor Preferences, SQLite ou outro storage nativo.
- Definir upload e armazenamento das fotos de treino.
- Avaliar sync incremental de treino com backend durante a sessao.
- Trocar token de autenticacao para secure storage nativo.
