# Minha Biblioteca

Aplicação web para cadastrar e organizar os livros que você tem em casa. Feita com React + Vite e conectada ao Supabase.

## Recursos

- Cadastro de livros
- Edição e exclusão
- Busca por título, autor, categoria ou ISBN
- Filtro por status: Não lido, Lendo e Lido
- Campos de editora, ano, páginas, localização/estante e observações
- Resumo com quantidade total, lidos, lendo e não lidos
- Layout responsivo para celular, tablet e computador

## 1. Criar a tabela no Supabase

Abra o SQL Editor do seu projeto Supabase, copie o conteúdo de `supabase/schema.sql` e execute.

> A versão inicial não possui autenticação. As políticas RLS permitem acesso à tabela `books` usando a chave pública. Não use a `service_role` ou qualquer chave secreta no navegador.

## 2. Configurar as variáveis

Crie um arquivo `.env` na raiz baseado em `.env.example`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON_OU_PUBLISHABLE
```

Use somente a chave pública (`anon`/`publishable`). Nunca coloque a chave secreta do Supabase no frontend nem faça commit dela no GitHub.

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

## Estrutura principal

- `src/App.jsx` — interface e operações de cadastro, edição, exclusão e busca
- `src/lib/supabase.js` — conexão com Supabase
- `src/styles.css` — visual responsivo
- `supabase/schema.sql` — criação da tabela, índices e políticas RLS
- `.env.example` — modelo das variáveis públicas
