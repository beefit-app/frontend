# Roadmap e Otimizações Futuras (Frontend)

Este documento centraliza as ideias arquiteturais e melhorias planejadas para diminuir a carga do servidor e melhorar a experiência offline-first do aplicativo.

## 1. Cache Geral e Pull-to-Refresh (Prioridade Alta)
- **Objetivo:** Fazer o aplicativo abrir instantaneamente, exibindo os dados mais recentes salvos localmente, enquanto busca atualizações em segundo plano.
- **Ações:**
  - Implementar o componente nativo `<IonRefresher>` (Arrastar para Atualizar) nas abas principais: Feed Social, Perfil e Catálogo.
  - Adicionar uma camada de cache local estruturado (ex: via `Preferences` do Capacitor ou banco `IndexedDB`) para armazenar o Feed Social e o Histórico de Treinos, garantindo suporte offline.

## 2. Compressão Severa de Mídia no Cliente (Prioridade Média)
- **Objetivo:** Economizar armazenamento no servidor, baratear custos de banda e acelerar o upload em redes móveis (3G/4G).
- **Ações:**
  - Interceptar a foto tirada pelo usuário (câmera ou galeria) antes do upload.
  - Redimensionar a imagem (ex: máximo de 800x800px).
  - Aplicar compressão com perda (ex: qualidade 70%) e converter para o formato `WebP`.

## 3. Catálogo de Exercícios Embutido (Depende do Backend)
- **Objetivo:** Eliminar a necessidade de fazer requisições à API para consultar ou buscar exercícios.
- **Ações:**
  - Empacotar o arquivo JSON (ou banco local) contendo todos os exercícios junto com a compilação do próprio app.
  - Implementar um mecanismo de versionamento: o app apenas baixa um novo arquivo JSON em segundo plano quando o backend notificar que o catálogo recebeu exercícios novos.
  - *Dependência:* Aguardar a curadoria e enriquecimento do banco de dados de exercícios no Backend.

## Funcionalidades Preservadas no Modelo Atual
- **Sessão de Treino Ativa (Start Workout):** Decidiu-se **não** tornar o rascunho de treino 100% offline. A chamada atual ao endpoint `/api/workout/start` é indispensável para alimentar o *Server-Sent Events (SSE)* e permitir que amigos saibam, em tempo real, quais grupos musculares o usuário está treinando naquele momento.
