create extension if not exists pgcrypto;

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  isbn text,
  category text,
  publisher text,
  year integer check (year is null or (year >= 0 and year <= 9999)),
  pages integer check (pages is null or pages > 0),
  status text not null default 'Não lido' check (status in ('Não lido', 'Lendo', 'Lido')),
  shelf text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at
before update on public.books
for each row execute function public.set_updated_at();

alter table public.books enable row level security;

-- Esta primeira versão é uma biblioteca pessoal sem login.
-- A chave pública pode acessar somente esta tabela através das políticas abaixo.
drop policy if exists "books_select_public" on public.books;
create policy "books_select_public"
on public.books for select
to anon, authenticated
using (true);

drop policy if exists "books_insert_public" on public.books;
create policy "books_insert_public"
on public.books for insert
to anon, authenticated
with check (true);

drop policy if exists "books_update_public" on public.books;
create policy "books_update_public"
on public.books for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "books_delete_public" on public.books;
create policy "books_delete_public"
on public.books for delete
to anon, authenticated
using (true);

create index if not exists books_title_idx on public.books using btree (lower(title));
create index if not exists books_author_idx on public.books using btree (lower(author));
create index if not exists books_status_idx on public.books (status);
