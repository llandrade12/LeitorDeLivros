-- =====================================================================
-- Portal de HQs — heróis cadastrados uma vez e vinculados a várias HQs
-- Rode no SQL Editor depois do 0004. Pode rodar de novo.
-- =====================================================================

create table if not exists public.personagens_series (
  personagem_id  uuid not null references public.personagens(id) on delete cascade,
  series_id      uuid not null references public.series(id) on delete cascade,
  primary key (personagem_id, series_id)
);
create index if not exists personagens_series_serie_idx on public.personagens_series(series_id);

-- Leva os vínculos antigos (personagens.series_id) para a tabela nova
insert into public.personagens_series (personagem_id, series_id)
select id, series_id from public.personagens where series_id is not null
on conflict do nothing;

-- O herói não pertence mais a uma HQ só (e não some se a HQ for apagada)
alter table public.personagens alter column series_id drop not null;
alter table public.personagens drop constraint if exists personagens_series_id_fkey;
alter table public.personagens
  add constraint personagens_series_id_fkey foreign key (series_id) references public.series(id) on delete set null;

alter table public.personagens_series enable row level security;

drop policy if exists "personagens: ver" on public.personagens;
create policy "personagens: ver" on public.personagens
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.personagens_series ps
      where ps.personagem_id = personagens.id and public.pode_ler_serie(ps.series_id)
    )
  );

drop policy if exists "personagens_series: ver"            on public.personagens_series;
drop policy if exists "personagens_series: admin gerencia" on public.personagens_series;
create policy "personagens_series: ver" on public.personagens_series
  for select to authenticated using (public.pode_ler_serie(series_id));
create policy "personagens_series: admin gerencia" on public.personagens_series
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
