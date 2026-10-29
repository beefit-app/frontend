# Testar comentários de postagens

## Preparar o ambiente

Os dois repositórios devem estar em `feature/post-comments`, com o backend e o
frontend desta entrega. Não teste o frontend novo contra a API antiga.

1. Mantenha Docker ativo. No diretório `backend/`, configure `JWT_SECRET` com no
   mínimo 32 caracteres e `BEEFIT_SECURITY_CORS_ALLOWED_ORIGINS` com a origem exata
   do Vite, por exemplo `http://localhost:5173`. Use as configurações locais do
   banco já utilizadas pelo projeto. Execute:

   ```bash
   ./mvnw spring-boot:run
   ```

   Flyway aplica `V15__post_comments.sql` automaticamente. A migration cria
   comentários e estende denúncias; use banco local/de teste, não produção para
   experimentar. Fotos novas continuam dependendo da configuração de R2 existente;
   comentários em si não precisam de mídia nem de credenciais reais de R2.

2. Em outro terminal, no diretório `frontend/`:

   ```bash
   npm ci
   npm run dev
   ```

   Configure `.env.local` conforme `.env.example`, com `VITE_API_URL` apontando para
   a API local, e desative `VITE_DEV_AUTH_BYPASS`. Abra a URL impressa pelo Vite.

3. Use duas contas, A e B, em navegadores/perfis separados. Aceite a amizade e
   publique um treino de A. Uma terceira conta C ajuda a testar falta de acesso.
   Publicações podem aparecer após o processamento assíncrono da finalização.

## Roteiro manual

| Ação | Resultado esperado |
| --- | --- |
| Abrir comentários no feed | Painel inferior sobre o feed, sem perder a posição de rolagem. Lista vazia informa “Ainda não há comentários. Seja o primeiro!”. |
| Abrir no próprio perfil e no perfil do amigo | Mesma interface e mesmos comentários. |
| Digitar apenas espaços | Enviar permanece desabilitado. |
| Digitar/colar mais de 360 caracteres | Campo limita a 360 e contador mostra `360/360`. Emojis compostos podem ocupar mais de uma unidade no contador, consistentemente com o limite UTF-16 da API. |
| Enviar 360 letras | Publica uma vez, limpa o campo após sucesso e atualiza o contador. |
| Enviar emojis, quebras de linha e `<b>texto</b>` | Emojis/quebras são mantidos; marcação aparece como texto, sem virar HTML. |
| B comentar no post de A, com ambos vendo o painel | A recebe a alteração via SSE e recupera a lista por REST. |
| Desconectar a rede antes de enviar | Erro visível; texto continua no campo para tentar novamente. |
| Tocar repetidamente em enviar | Apenas uma requisição simultânea; botão fica desabilitado durante o envio. |
| Fechar e reabrir; voltar à janela após desconexão | Reconsulta o estado real, sem depender de replay SSE. |
| Publicar mais de 20 comentários | “Ver mais comentários” pagina sem repetir os já carregados; os mais recentes ficam primeiro. |
| B abrir ações do próprio comentário | Pode excluir, com confirmação; não pode denunciar a si mesmo. |
| A abrir ações de um comentário de B | Pode excluir ou denunciar; remover comentário não apaga o treino. |
| Outro amigo abrir ações do comentário de B | Pode denunciar, mas não excluir comentário alheio. |
| Abrir painel com teclado no celular | Campo/enviar continuam visíveis; lista rola sem mover o feed ao fundo. |
| Usar Tab, Shift+Tab e Escape no desktop | Foco permanece no painel; fechar devolve foco ao botão de comentários. |

O rate limit é de **10 publicações por minuto por usuário**. Para testar paginação,
respeite a janela ou distribua as publicações entre as contas. A API responde `429`
com `Retry-After` quando o limite é ultrapassado.

## Permissões e moderação

- C, sem amizade, não deve conseguir listar, contar nem publicar comentários
  usando diretamente o ID da postagem.
- Após desfazer amizade, ativar modo fantasma do autor ou tornar o treino privado,
  terceiros perdem acesso aos comentários pela API. O autor do comentário ainda
  pode apagar o próprio texto pelo endpoint de exclusão, sem recuperar o post.
- Denuncie um comentário de outra pessoa e acesse `/admin` com uma conta
  administradora. A fila deve mostrar o texto do comentário e oferecer **Remover
  comentário**, banir o autor ou descartar a denúncia. Remover deve ocultar o
  comentário, atualizar a contagem e fechar denúncias pendentes do mesmo alvo.
- Apague um treino com comentários/denúncias: o treino e suas dependências devem
  ser removidos sem erro de FK. Repita em contas descartáveis com exclusão da conta
  do comentarista e do autor da postagem. **Essas operações são irreversíveis.**

## Comandos automatizados

Em `backend/`, com Java 25 e Docker:

```bash
./mvnw verify
```

Em `frontend/`:

```bash
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Para testar em Android/iOS, sincronize e gere o aplicativo somente após aprovar
um build `alpha-X` (X conforme a versão atual). A validação web não substitui o
teste de teclado, safe area e navegação em dispositivo real.

## Contrato

- `GET /api/posts/{postId}/comments?page=0&size=20`: página, até 50 itens por chamada,
  ordenada por `createdAt DESC, id DESC`.
- `GET /api/posts/{postId}/comments/count`: total visível, com autorização do post.
- `POST /api/posts/{postId}/comments`, JSON `{ "text": "Bom treino!" }`: `201`.
- `DELETE /api/posts/{postId}/comments/{commentId}`: `204`.
- `POST /api/reports` aceita `targetType: "COMMENT"`.
- Decisão administrativa aceita `action: "REMOVE_COMMENT"`.

O banco mantém comentários removidos logicamente para moderação. Excluir a conta
ou o treino remove fisicamente comentários relacionados e denúncias contra eles.
SSE contém apenas o ID da postagem, nunca o texto do comentário, e não é durável.
