-- O que mudou no banco depois do 1-tabela.sql.
-- Pode rodar mais de uma vez sem erro.

-- 1. Origem "audio": gastos lançados pelo botão Falar.
alter table public.gastos drop constraint if exists gastos_origem_check;
alter table public.gastos add constraint gastos_origem_check
  check (origem in ('manual', 'texto', 'foto', 'audio'));

-- 2. Limites: o limite do mês que a pessoa escolhe para cada categoria.
create table if not exists public.limites (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  categoria text not null,
  valor numeric not null check (valor > 0),
  criado_em timestamptz not null default now(),
  unique (dono, categoria)
);

alter table public.limites enable row level security;

drop policy if exists "ver os meus limites" on public.limites;
drop policy if exists "definir os meus limites" on public.limites;
drop policy if exists "mudar os meus limites" on public.limites;
drop policy if exists "tirar os meus limites" on public.limites;
create policy "ver os meus limites" on public.limites for select to authenticated using (dono = (select auth.uid()));
create policy "definir os meus limites" on public.limites for insert to authenticated with check (dono = (select auth.uid()));
create policy "mudar os meus limites" on public.limites for update to authenticated using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
create policy "tirar os meus limites" on public.limites for delete to authenticated using (dono = (select auth.uid()));

-- 3. Poupança: a meta do cofrinho (uma por pessoa) e cada valor guardado.
create table if not exists public.poupanca (
  id uuid primary key default gen_random_uuid(),
  dono uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('meta', 'guardado')),
  nome text,
  valor numeric not null check (valor > 0),
  data date not null default current_date,
  criado_em timestamptz not null default now()
);

create unique index if not exists poupanca_uma_meta on public.poupanca (dono) where tipo = 'meta';
create index if not exists poupanca_dono on public.poupanca (dono);

alter table public.poupanca enable row level security;

drop policy if exists "ver a minha poupanca" on public.poupanca;
drop policy if exists "anotar na minha poupanca" on public.poupanca;
drop policy if exists "mudar a minha poupanca" on public.poupanca;
drop policy if exists "apagar da minha poupanca" on public.poupanca;
create policy "ver a minha poupanca" on public.poupanca for select to authenticated using (dono = (select auth.uid()));
create policy "anotar na minha poupanca" on public.poupanca for insert to authenticated with check (dono = (select auth.uid()));
create policy "mudar a minha poupanca" on public.poupanca for update to authenticated using (dono = (select auth.uid())) with check (dono = (select auth.uid()));
create policy "apagar da minha poupanca" on public.poupanca for delete to authenticated using (dono = (select auth.uid()));

-- 4. Descrição: continua obrigatória no banco. Quando a pessoa não escreve,
--    o app e o assistente gravam o nome da categoria no lugar.

-- 5. Resumo da semana com valores no formato brasileiro (R$ 1.234,56).
--    O to_char usa vírgula e ponto fixos e depois troca um pelo outro.
create or replace function public.gerar_resumos()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    with semana as (
      select dono, categoria, valor from public.gastos where data >= current_date - 7
    ), por_categoria as (
      select dono, categoria, sum(valor) as soma,
             row_number() over (partition by dono order by sum(valor) desc) as ordem
        from semana group by dono, categoria
    )
    select s.dono, sum(s.valor) as total, count(*) as lancamentos,
           max(p.categoria) filter (where p.ordem = 1) as maior_categoria,
           max(p.soma) filter (where p.ordem = 1) as maior_valor
      from semana s
      join por_categoria p on p.dono = s.dono and p.categoria = s.categoria
     group by s.dono
  loop
    insert into public.resumos (dono, semana, texto)
    values (r.dono, current_date,
            format('Nos últimos 7 dias: R$ %s em %s %s. A maior categoria foi %s, com R$ %s.',
                   translate(to_char(r.total, 'FM999,999,990.00'), ',.', '.,'),
                   r.lancamentos, case when r.lancamentos = 1 then 'lançamento' else 'lançamentos' end,
                   r.maior_categoria, translate(to_char(r.maior_valor, 'FM999,999,990.00'), ',.', '.,')));
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke execute on function public.gerar_resumos() from public, anon, authenticated;
