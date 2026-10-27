-- Categorias criadas pela própria pessoa (no lugar de "Outros").
-- Pode rodar mais de uma vez sem erro.

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 30),
  criado_em timestamptz not null default now()
);

-- Uma pessoa não repete o mesmo nome (sem diferenciar maiúsculas).
create unique index if not exists categorias_dono_nome on public.categorias (dono, lower(nome));

alter table public.categorias enable row level security;

drop policy if exists "ver as minhas categorias" on public.categorias;
drop policy if exists "criar as minhas categorias" on public.categorias;
drop policy if exists "apagar as minhas categorias" on public.categorias;
create policy "ver as minhas categorias" on public.categorias for select to authenticated using (dono = (select auth.uid()));
create policy "criar as minhas categorias" on public.categorias for insert to authenticated with check (dono = (select auth.uid()));
create policy "apagar as minhas categorias" on public.categorias for delete to authenticated using (dono = (select auth.uid()));
