-- Categorias editáveis: cada categoria guarda o ícone escolhido
-- e a pessoa pode renomear as suas. Pode rodar mais de uma vez sem erro.

alter table public.categorias add column if not exists icone text;

drop policy if exists "mudar as minhas categorias" on public.categorias;
create policy "mudar as minhas categorias" on public.categorias for update to authenticated
  using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
