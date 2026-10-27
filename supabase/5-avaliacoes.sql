-- Avaliações do app: nota de 1 a 5 e observações sobre o que funciona,
-- o que não funciona e o que pode melhorar ou ser acrescentado.
-- Pode rodar mais de uma vez sem erro.

create table if not exists public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nota smallint check (nota between 1 and 5),
  funciona text check (char_length(funciona) <= 1000),
  nao_funciona text check (char_length(nao_funciona) <= 1000),
  melhorar text check (char_length(melhorar) <= 1000),
  criado_em timestamptz not null default now(),
  -- precisa ter ao menos a nota ou um texto
  check (nota is not null or coalesce(funciona, nao_funciona, melhorar) is not null)
);

create index if not exists avaliacoes_dono on public.avaliacoes (dono, criado_em desc);

alter table public.avaliacoes enable row level security;

drop policy if exists "ver as minhas avaliacoes" on public.avaliacoes;
drop policy if exists "enviar as minhas avaliacoes" on public.avaliacoes;
drop policy if exists "apagar as minhas avaliacoes" on public.avaliacoes;
create policy "ver as minhas avaliacoes" on public.avaliacoes for select to authenticated using (dono = (select auth.uid()));
create policy "enviar as minhas avaliacoes" on public.avaliacoes for insert to authenticated with check (dono = (select auth.uid()));
create policy "apagar as minhas avaliacoes" on public.avaliacoes for delete to authenticated using (dono = (select auth.uid()));
