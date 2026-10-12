-- EPP Gestão Documental: isolamento por área aplicado no PostgreSQL com RLS.
create extension if not exists pgcrypto;

do $$ begin create type public.epp_area as enum ('administrativa','instrucao_ensino');
exception when duplicate_object then null; end $$;
do $$ begin create type public.epp_profile_role as enum ('administrador','gestor','utilizador');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  area public.epp_area not null,
  role public.epp_profile_role not null default 'utilizador',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.document_counters (
  area public.epp_area not null,
  document_year integer not null,
  last_number bigint not null default 0 check (last_number >= 0),
  primary key (area, document_year)
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  area public.epp_area not null,
  document_number text not null,
  document_year integer not null,
  document_type text not null,
  subject text not null,
  origin text not null default '',
  destination text not null default '',
  document_date date not null default current_date,
  status text not null default 'Recebido' check (status in ('Recebido','Em análise','Respondido','Arquivado')),
  summary text not null default '',
  attachment_path text,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area, document_number),
  check (document_year between 2000 and 2200)
);
create table if not exists public.document_history (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  area public.epp_area not null,
  actor_id uuid not null references auth.users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_history enable row level security;
alter table public.document_counters enable row level security;

drop policy if exists "profile read own" on public.profiles;
create policy "profile read own" on public.profiles for select to authenticated
using (id = (select auth.uid()));

drop policy if exists "read documents in assigned area" on public.documents;
create policy "read documents in assigned area" on public.documents for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.area = documents.area));

drop policy if exists "insert documents in assigned area" on public.documents;
create policy "insert documents in assigned area" on public.documents for insert to authenticated
with check (created_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.area = documents.area));

drop policy if exists "update documents in assigned area" on public.documents;
create policy "update documents in assigned area" on public.documents for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.area = documents.area))
with check (updated_by = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.area = documents.area));

drop policy if exists "delete documents for area admins" on public.documents;
create policy "delete documents for area admins" on public.documents for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.area = documents.area and p.role = 'administrador'));

drop policy if exists "read history in assigned area" on public.document_history;
create policy "read history in assigned area" on public.document_history for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.area = document_history.area));

revoke all on public.document_counters from anon, authenticated;
revoke all on public.profiles from anon;
revoke all on public.documents from anon;
revoke all on public.document_history from anon;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.document_history to authenticated;

-- Atribuição sequencial atómica, independente por área e ano.
create or replace function public.assign_document_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_area public.epp_area; v_year integer; v_seq bigint;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória'; end if;
  select p.area into v_area from public.profiles p where p.id = auth.uid() and p.active = true;
  if v_area is null or v_area <> new.area then raise exception 'Sem permissão para esta área'; end if;
  v_year := extract(year from coalesce(new.document_date, current_date))::integer;
  insert into public.document_counters(area, document_year, last_number) values (v_area, v_year, 1)
  on conflict (area, document_year) do update set last_number = public.document_counters.last_number + 1
  returning last_number into v_seq;
  new.document_year := v_year;
  new.document_number := (case when v_area = 'administrativa' then 'ADM' else 'IE' end) || '/' || v_year::text || '/' || lpad(v_seq::text, 4, '0');
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  return new;
end; $$;
revoke all on function public.assign_document_number() from public, anon, authenticated;
create trigger documents_assign_number before insert on public.documents for each row execute function public.assign_document_number();

create or replace function public.set_document_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if new.area <> old.area or new.document_number <> old.document_number or new.document_year <> old.document_year then
    raise exception 'A área e a numeração do documento são imutáveis';
  end if;
  return new;
end; $$;
create trigger documents_updated_at before update on public.documents for each row execute function public.set_document_updated_at();

create or replace function public.log_document_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.document_history(document_id, area, actor_id, action, details)
  values (new.id, new.area, auth.uid(), case when tg_op = 'INSERT' then 'criação' else 'actualização' end,
    jsonb_build_object('number', new.document_number, 'subject', new.subject, 'status', new.status));
  return new;
end; $$;
revoke all on function public.log_document_change() from public, anon, authenticated;
create trigger documents_history after insert or update on public.documents for each row execute function public.log_document_change();

-- Anexos privados: caminho obrigatório no formato administrativa/<ficheiro> ou instrucao_ensino/<ficheiro>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('epp-documents','epp-documents',false,15728640,array['application/pdf','image/png','image/jpeg','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do nothing;

drop policy if exists "area members read document files" on storage.objects;
create policy "area members read document files" on storage.objects for select to authenticated
using (bucket_id = 'epp-documents' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and (storage.foldername(name))[1] = p.area::text));
drop policy if exists "area members upload document files" on storage.objects;
create policy "area members upload document files" on storage.objects for insert to authenticated
with check (bucket_id = 'epp-documents' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and (storage.foldername(name))[1] = p.area::text));
drop policy if exists "area members update document files" on storage.objects;
create policy "area members update document files" on storage.objects for update to authenticated
using (bucket_id = 'epp-documents' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and (storage.foldername(name))[1] = p.area::text))
with check (bucket_id = 'epp-documents' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and (storage.foldername(name))[1] = p.area::text));
drop policy if exists "area admins delete document files" on storage.objects;
create policy "area admins delete document files" on storage.objects for delete to authenticated
using (bucket_id = 'epp-documents' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.active and p.role = 'administrador' and (storage.foldername(name))[1] = p.area::text));

-- Criar utilizadores em Auth e depois atribuir area/role ao perfil por uma operação administrativa segura.
-- Exemplo manual no SQL Editor: INSERT INTO public.profiles (id,full_name,area,role) VALUES ('UUID_AUTH','Nome','administrativa','administrador');
