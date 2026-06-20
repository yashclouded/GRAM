-- GRAM Protocol Supabase Schema
-- Phase 0: Marketplace MVP

-- ============================================================
-- PROFILES (already exists — keep unchanged, shown for reference)
-- ============================================================
-- create table public.profiles (
--   id uuid references auth.users on delete cascade not null primary key,
--   role text check (role in ('farmer', 'buyer', 'transporter')),
--   name text,
--   phone text,
--   village text,
--   district text,
--   state text,
--   reputation_score integer default 50,
--   completed_trades integer default 0,
--   success_rate numeric default 100.0,
--   created_at timestamp with time zone default timezone('utc'::text, now()) not null
-- );

-- ============================================================
-- LISTINGS (farmer crop listings)
-- ============================================================
create table if not exists public.listings (
  id              uuid primary key default gen_random_uuid(),
  farmer_id       uuid references auth.users on delete cascade not null,
  crop            text not null,
  quantity        numeric not null check (quantity > 0),
  unit            text default 'Quintal',
  grade           text check (grade in ('A','B','C')) not null,
  price_per_unit  numeric not null check (price_per_unit > 0),
  location        text not null,
  description     text,
  status          text check (status in ('available','offer_received','sold','in_transit','delivered')) default 'available',
  created_at      timestamptz default now()
);

alter table public.listings enable row level security;

create policy "Listings are viewable by authenticated users" on public.listings
  for select using (auth.role() = 'authenticated');

create policy "Farmers can insert their own listings" on public.listings
  for insert with check (auth.uid() = farmer_id);

create policy "Farmers can update their own listings" on public.listings
  for update using (auth.uid() = farmer_id);

-- ============================================================
-- ORDERS (buyer places order against a listing)
-- ============================================================
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references public.listings on delete cascade not null,
  buyer_id        uuid references auth.users on delete cascade not null,
  farmer_id       uuid references auth.users on delete cascade not null,
  transporter_id  uuid references auth.users on delete set null,
  quantity        numeric not null check (quantity > 0),
  agreed_price    numeric not null check (agreed_price > 0),
  status          text check (status in (
    'pending','accepted','rejected',
    'transporter_assigned','picked_up','in_transit','delivered','payment_confirmed'
  )) default 'pending',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.orders enable row level security;

-- Parties involved in the order can see it
create policy "Order participants can view orders" on public.orders
  for select using (
    auth.uid() = buyer_id OR
    auth.uid() = farmer_id OR
    auth.uid() = transporter_id
  );

-- Transporters can see orders without a transporter (to accept available jobs)
create policy "Transporters can view unassigned orders" on public.orders
  for select using (
    status = 'accepted' AND transporter_id IS NULL AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'transporter'
    )
  );

create policy "Buyers can insert orders" on public.orders
  for insert with check (auth.uid() = buyer_id);

create policy "Farmers can update order status (accept/reject)" on public.orders
  for update using (auth.uid() = farmer_id);

create policy "Buyers can update order status (confirm delivery)" on public.orders
  for update using (auth.uid() = buyer_id);

create policy "Transporters can update order status" on public.orders
  for update using (auth.uid() = transporter_id OR (
    transporter_id IS NULL AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'transporter')
  ));

-- Auto-update updated_at
create or replace function public.update_order_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on public.orders
  for each row execute procedure public.update_order_updated_at();

-- ============================================================
-- TRANSPORTER PROFILES (vehicle info)
-- ============================================================
create table if not exists public.transporter_profiles (
  id           uuid primary key references auth.users on delete cascade,
  vehicle_type text,
  capacity     numeric,
  service_area text,
  updated_at   timestamptz default now()
);

alter table public.transporter_profiles enable row level security;

create policy "Transporter profiles viewable by authenticated users" on public.transporter_profiles
  for select using (auth.role() = 'authenticated');

create policy "Transporters can insert their own profile" on public.transporter_profiles
  for insert with check (auth.uid() = id);

create policy "Transporters can update their own profile" on public.transporter_profiles
  for update using (auth.uid() = id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  message_en  text not null,
  message_hi  text not null,
  read        boolean default false,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "System can insert notifications" on public.notifications
  for insert with check (auth.uid() = user_id OR auth.role() = 'service_role');

create policy "Users can mark notifications read" on public.notifications
  for update using (auth.uid() = user_id);

-- ============================================================
-- HELPER: Auto-create notification on order status change
-- ============================================================
create or replace function public.notify_order_status_change()
returns trigger as $$
declare
  msg_en text;
  msg_hi text;
  target_user uuid;
begin
  -- Map status changes to human-readable messages
  if new.status = 'accepted' then
    msg_en := 'Your order has been accepted by the farmer.';
    msg_hi := 'आपका ऑर्डर किसान ने स्वीकार कर लिया है।';
    target_user := new.buyer_id;
  elsif new.status = 'rejected' then
    msg_en := 'Your order was rejected by the farmer.';
    msg_hi := 'किसान ने आपका ऑर्डर अस्वीकार कर दिया।';
    target_user := new.buyer_id;
  elsif new.status = 'transporter_assigned' then
    msg_en := 'A transporter has been assigned to your order.';
    msg_hi := 'आपके ऑर्डर के लिए एक ट्रांसपोर्टर नियुक्त किया गया है।';
    target_user := new.farmer_id;
  elsif new.status = 'picked_up' then
    msg_en := 'Your order has been picked up by the transporter.';
    msg_hi := 'ट्रांसपोर्टर ने आपका सामान उठा लिया है।';
    target_user := new.farmer_id;
  elsif new.status = 'delivered' then
    msg_en := 'Your order has been delivered. Please confirm.';
    msg_hi := 'आपका ऑर्डर डिलीवर हो गया। कृपया पुष्टि करें।';
    target_user := new.buyer_id;
  elsif new.status = 'payment_confirmed' then
    msg_en := 'Payment confirmed for your order.';
    msg_hi := 'आपके ऑर्डर का भुगतान पुष्टि हो गई।';
    target_user := new.farmer_id;
  end if;

  if msg_en is not null and target_user is not null then
    insert into public.notifications (user_id, message_en, message_hi)
    values (target_user, msg_en, msg_hi);
  end if;

  -- Notify farmer when order is placed
  if old.status is null and new.status = 'pending' then
    insert into public.notifications (user_id, message_en, message_hi)
    values (new.farmer_id,
      'Your listing received a new offer.',
      'आपकी लिस्टिंग को एक नया ऑफर मिला है।'
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger orders_status_notify
  after insert or update of status on public.orders
  for each row execute procedure public.notify_order_status_change();

-- Update listing status when order accepted
create or replace function public.update_listing_on_order_accept()
returns trigger as $$
begin
  if new.status = 'accepted' then
    update public.listings set status = 'offer_received' where id = new.listing_id;
  elsif new.status = 'payment_confirmed' then
    update public.listings set status = 'delivered' where id = new.listing_id;
  elsif new.status = 'in_transit' then
    update public.listings set status = 'in_transit' where id = new.listing_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger listing_status_sync
  after update of status on public.orders
  for each row execute procedure public.update_listing_on_order_accept();
alter publication supabase_realtime add table listings; alter publication supabase_realtime add table orders; alter publication supabase_realtime add table transporter_profiles;
