-- =====================================================================
-- Portal de HQs — personagens (heróis) de cada HQ
-- Rode no SQL Editor depois do 0001, 0002 e 0003. Pode rodar de novo.
-- =====================================================================

create table if not exists public.personagens (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references public.series(id) on delete cascade,
  nome         text not null default '',
  imagem_path  text,                      -- PNG com fundo transparente fica melhor
  cor          text not null default '#4d83f4',
  ordem        int not null default 0,
  criado_em    timestamptz not null default now()
);
create index if not exists personagens_serie_idx on public.personagens(series_id, ordem);

alter table public.personagens enable row level security;

drop policy if exists "personagens: ver"            on public.personagens;
drop policy if exists "personagens: admin gerencia" on public.personagens;
create policy "personagens: ver" on public.personagens
  for select to authenticated using (public.pode_ler_serie(series_id));
create policy "personagens: admin gerencia" on public.personagens
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
