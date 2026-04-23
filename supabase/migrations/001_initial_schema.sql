-- ICEGROUP WhatsApp Agent — Schema inicial
-- Ejecutar en Supabase SQL Editor

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  telefono varchar not null unique,
  nombre varchar,
  ciudad varchar,
  negocio_nombre varchar,
  negocio_tipo varchar,
  interes varchar,
  es_emprendedor boolean,
  estado varchar default 'nuevo',
  total_venta numeric,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists conversaciones (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references leads(id) on delete cascade,
  rol varchar not null check (rol in ('user', 'assistant')),
  mensaje text not null,
  created_at timestamp with time zone default now()
);

create table if not exists errores (
  id uuid default gen_random_uuid() primary key,
  telefono varchar,
  error_mensaje text,
  payload jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists idx_leads_telefono on leads(telefono);
create index if not exists idx_conversaciones_lead_id on conversaciones(lead_id);
create index if not exists idx_conversaciones_created_at on conversaciones(created_at);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_leads_updated_at on leads;
create trigger update_leads_updated_at
  before update on leads
  for each row execute function update_updated_at_column();
