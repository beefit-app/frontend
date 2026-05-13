# BeeFit

> Rede social de academia

---

## Índice

- [Padrões de Commit](#-padrões-de-commit)
- [Documentação](#-documentação)
- [Licença](#-licença)

---

## Padrões de Commit

> **Por que isso importa?** Um histórico de commits bem escrito é uma forma de documentação. Ele permite entender _o que_ mudou, _por que_ mudou e _quando_ — sem precisar ler cada linha de código alterada.

Este projeto adota o padrão **[Conventional Commits](https://www.conventionalcommits.org/pt-br/)**.

### Formato

```
<tipo>(escopo opcional): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

### Tipos de Commit

| Tipo       | Quando usar             | Exemplo                                              |
| ---------- | ----------------------- | ---------------------------------------------------- |
| `feat`     | Nova funcionalidade     | `feat(auth): adiciona login com Google`              |
| `fix`      | Correção de bug         | `fix(api): corrige erro 500 no endpoint de usuários` |
| `docs`     | Apenas documentação     | `docs: atualiza instruções de instalação`            |
| `style`    | Formatação, sem lógica  | `style: corrige indentação nos componentes`          |
| `refactor` | Refatoração de código   | `refactor(db): simplifica query de produtos`         |
| `test`     | Testes                  | `test(auth): adiciona testes unitários para JWT`     |
| `chore`    | Tarefas de manutenção   | `chore: atualiza dependências do projeto`            |
| `perf`     | Melhoria de performance | `perf(images): implementa lazy loading`              |
| `ci`       | Integração contínua     | `ci: adiciona pipeline de deploy automático`         |
| `build`    | Sistema de build        | `build: configura webpack para produção`             |
| `revert`   | Reverte um commit       | `revert: reverte feat(auth): login com Google`       |

### Regras

- ✅ Use o **imperativo** na descrição: _"adiciona"_, _"corrige"_, _"remove"_ — não _"adicionado"_ ou _"adicionando"_
- ✅ Limite a linha de descrição a **72 caracteres**
- ✅ Use letras **minúsculas**
- ✅ Seja **específico**: prefira `fix(cart): corrige cálculo de frete para CEPs do RJ` a `fix: bug no carrinho`
- ❌ Evite mensagens vagas como `fix: ajustes`, `update`, `wip`, `changes`

### Exemplos

```bash
# ✅ Bom
feat(checkout): integra gateway de pagamento Stripe
fix(user): corrige validação de CPF com caracteres especiais
docs(api): documenta endpoints de autenticação com exemplos
refactor(hooks): extrai lógica de formulário para useForm

# ❌ Ruim
git commit -m "fix"
git commit -m "ajustes gerais"
git commit -m "terminei a feature"
git commit -m "update 2"
```

### Breaking Changes

Quando uma mudança quebra compatibilidade, adicione `!` após o tipo ou use `BREAKING CHANGE` no rodapé:

```bash
feat(api)!: remove suporte ao endpoint /v1/users

BREAKING CHANGE: o endpoint /v1/users foi removido.
Use /v2/users com autenticação via Bearer token.
```

---

## Documentação

> **Por que documentar?** Código sem documentação é um ativo que se deprecia rapidamente. O programador que escreveu uma função hoje não será o mesmo que precisará mantê-la em seis meses — e muitas vezes nem vai se lembrar da decisão tomada.

### O que documentar

| O quê                   | Onde                         | Por quê                                |
| ----------------------- | ---------------------------- | -------------------------------------- |
| Decisões de arquitetura | `docs/architecture/`         | Evita repetir discussões já resolvidas |
| Endpoints da API        | `docs/api/` ou Swagger       | Facilita integrações                   |
| Variáveis de ambiente   | `.env.example` + comentários | Evita erros silenciosos em produção    |
| Fluxos complexos        | Comentários no código        | Economiza horas de leitura             |
| Decisões não-óbvias     | Comentários `// Por que:`    | Preserva o contexto                    |

### Boas Práticas

```js
// ❌ Comentário inútil — descreve o óbvio
// Incrementa o contador
i++;

// ✅ Comentário útil — explica o porquê
// O índice começa em 1 porque o item 0 é reservado para o placeholder da UI
let i = 1;

// ✅ Explica uma decisão não-óbvia
// Usamos debounce de 400ms em vez de 300ms após testes com usuários
// mostrarem que 300ms causava chamadas duplas em conexões lentas
const handleSearch = debounce(search, 400);
```

---

## Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

---
