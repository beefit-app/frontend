# Guia de integração da autenticação

## Visão geral

O frontend trata autenticação em quatro camadas:

- `sessionStorage`: persiste o token de acesso e um cache do usuário autenticado no navegador.
- `apiClient`: envia requests HTTP, injeta `Authorization: Bearer <token>` e dispara o evento global de `401`.
- `authService`: escolhe entre mock e API real, normaliza payloads e resolve `login`, `register`, `restoreSession` e `logout`.
- `AuthContext`: mantém o estado React da sessão e expõe `useAuth()` para as telas.

As telas de login e cadastro não chamam a API diretamente. Elas interagem apenas com `useAuth()`.

## O que o backend deve expor

### `POST /auth/login`

Request:

```json
{
  "email": "user@email.com",
  "password": "123456"
}
```

Resposta preferida:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "uuid",
    "fullName": "Bee Fit",
    "username": "beefit",
    "email": "user@email.com",
    "bodyWeight": 75.5,
    "weeklyGoal": 4
  }
}
```

Compatibilidade transitória:

- o backend atual também é aceito no formato `{ "token": "jwt", "userResponseDTO": { ... } }`
- o frontend ainda aceita resposta `token-only` no formato `{ "accessToken": "jwt" }`
- o frontend também aceita `{ "token": "jwt" }`
- nesses casos o `authService` busca o usuário atual e usa o cache local para completar campos ausentes

### `POST /auth/register`

Request esperado pelo frontend normalizado:

```json
{
  "fullName": "Bee Fit",
  "username": "beefit",
  "email": "user@email.com",
  "password": "123456",
  "bodyWeight": 75.5,
  "weeklyGoal": 4
}
```

Resposta preferida:

- a mesma resposta de sessão usada em `POST /auth/login`

Compatibilidade transitória:

- se o backend responder sem sessão pronta, o frontend faz fallback para `register + login`

### `GET /auth/me`

Headers:

```http
Authorization: Bearer <token>
```

Resposta esperada:

```json
{
  "id": "uuid",
  "fullName": "Bee Fit",
  "username": "beefit",
  "email": "user@email.com",
  "bodyWeight": 75.5,
  "weeklyGoal": 4
}
```

Uso:

- é chamado durante `restoreSession()` quando já existe token salvo no app
- se responder `401`, a sessão local é descartada
- se responder `404`, o frontend tenta `GET /api/profile/me` e depois `GET /users/me`

## Como cada parte se conecta

### `sessionStorage`

- chave atual: `beefit.auth.accessToken`
- chave de cache do usuário: `beefit.auth.user`
- nenhuma tela deve ler ou escrever token ou usuário diretamente
- a troca de storage seguro futuro deve continuar isolada aqui

### `apiClient`

- usa `VITE_API_URL` para compor a base da API
- adiciona `Authorization` quando a request é marcada com `auth: true`
- dispara `beefit:auth-unauthorized` em `401` autenticado
- não conhece regras de login, cadastro ou restore

### `authService`

- ponto principal de integração com o backend
- faz o mapeamento entre contrato externo e tipos internos do app
- escolhe `mock` quando `VITE_DEV_AUTH_BYPASS=true` ou quando `VITE_API_URL` não existe
- no modo API:
  - `login()` chama `/auth/login`
  - `register()` chama `/auth/register`
  - `restoreSession()` tenta reconstruir a sessão a partir do token salvo e do cache local do usuário
  - `getCurrentUser()` tenta `/auth/me`, depois `/api/profile/me`, com fallback transitório para `/users/me`

### `AuthContext`

- espera receber do `authService` uma sessão já normalizada
- não deve conhecer shape da API nem endpoints
- reage ao evento global de `401` limpando sessão e estado local

### Telas

- `LoginScreen` usa `login()`
- `RegisterScreen` usa `register()`
- `App` depende apenas de `isAuthenticated` e `isBootstrapping`
- nenhuma tela deve chamar `fetch`, `apiClient` ou `localStorage` para autenticação

## Checklist de integração

1. Definir `VITE_API_URL` para apontar ao backend real.
2. Confirmar se o ambiente deve manter ou desativar `VITE_DEV_AUTH_BYPASS`.
3. Validar `POST /auth/login` com usuário existente.
4. Validar `POST /auth/register` com sucesso e com erros de email/username duplicados.
5. Validar `GET /auth/me` com token válido ou `404` seguido de `GET /api/profile/me`.
6. Validar limpeza automática da sessão após `401`.
7. Confirmar se o backend já responde `token + user` ou ainda exige fallback `register + login`.

## Mapeamentos de contrato

O frontend ainda usa alguns nomes internos diferentes na UI:

- `fullName -> name/displayName`
- `bodyWeight -> weight`
- `token -> accessToken`
- `userResponseDTO -> user`

Essas conversões devem continuar centralizadas no `authService` e no `profileService`.

## Quando remover os fallbacks transitórios

Os seguintes pontos podem ser removidos quando todos os ambientes estiverem no contrato novo:

- fallback de `GET /users/me`
- fallback de `GET /api/profile/me` com merge sobre o cache local
- fallback de `POST /auth/register` seguido de `POST /auth/login`
- suporte a resposta `token-only` em `login`
- suporte ao contrato legado `{ token, userResponseDTO }`
# Contrato de segurança do cliente mobile

O aplicativo Capacitor usa `Authorization: Bearer <accessToken>` em chamadas à API e
mantém tokens no armazenamento seguro nativo. A API de produção deve estar em HTTPS.

- `VITE_API_URL` é obrigatória nos builds de homologação e produção.
- `VITE_DEV_AUTH_BYPASS=true` é exclusivamente para desenvolvimento local; não deve
  constar em builds distribuídos.
- `POST /auth/refresh` recebe `refreshToken` e `deviceId` e deve rotacionar ambos os
  tokens quando a sessão for renovada.
- `POST /api/workout/{workoutId}/finish` recebe o cabeçalho `Idempotency-Key`. O backend
  deve guardar a chave por usuário/sessão e devolver a mesma conclusão em reenvios.
- Uploads de mídia devem validar conteúdo, tamanho, dimensões, autorização e tipo MIME
  no servidor; a validação do app é apenas uma proteção adicional de UX.
