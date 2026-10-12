# Gestão Documental — Subdirecções da EPP

Aplicação de gestão documental para a Subdirecção Administrativa e a Subdirecção de Instrução e Ensino da Escola Prática de Polícia.

## Princípios

- Áreas isoladas por autorização validada no servidor e políticas de base de dados.
- Numeração documental independente por área e por ano.
- Autenticação através de Supabase Auth; sem contas ou palavras-passe de demonstração.
- Dashboard alimentado por dados reais, sem estatísticas fictícias.

## Configuração

1. Instalar dependências: `npm install`.
2. Criar um projecto Supabase e configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env`.
3. Aplicar `supabase/migrations/0001_initial_schema.sql` no SQL Editor do Supabase.
4. Criar utilizadores em Supabase Auth e atribuir-lhes uma área/role em `public.profiles` através de uma operação administrativa segura.
5. Executar `npm run dev`.

Nunca colocar chaves `service_role` no frontend. A aplicação não deve ser considerada pronta para produção até validar RLS, Storage, utilizadores reais e testes de isolamento entre áreas.

## Logótipo

Colocar o ficheiro oficial do emblema da EPP em `public/epp-logo.png`. A interface usa esse caminho no ecrã de login e no cabeçalho.
