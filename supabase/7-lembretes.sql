-- Lembretes de contas recorrentes (todo mês, num dia escolhido).
-- "pago_mes" guarda o primeiro dia do mês em que a conta foi marcada como paga.
-- Pode rodar mais de uma vez sem erro.

create table if not exists public.lembretes (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 40),
  categoria text not null,
  valor numeric check (valor > 0),
  dia smallint not null check (dia between 1 and 31),
  pago_mes date,
  criado_em timestamptz not null default now()
);

create index if not exists lembretes_dono on public.lembretes (dono, dia);

alter table public.lembretes enable row level security;

drop policy if exists "ver os meus lembretes" on public.lembretes;
drop policy if exists "criar os meus lembretes" on public.lembretes;
drop policy if exists "mudar os meus lembretes" on public.lembretes;
drop policy if exists "apagar os meus lembretes" on public.lembretes;
create policy "ver os meus lembretes" on public.lembretes for select to authenticated using (dono = (select auth.uid()));
create policy "criar os meus lembretes" on public.lembretes for insert to authenticated with check (dono = (select auth.uid()));
create policy "mudar os meus lembretes" on public.lembretes for update to authenticated using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
create policy "apagar os meus lembretes" on public.lembretes for delete to authenticated using (dono = (select auth.uid()));
