-- 1. Vouchers Table
CREATE TABLE IF NOT EXISTS vouchers (
  voucher_code TEXT PRIMARY KEY,
  guest_name TEXT,
  email TEXT,
  whatsapp TEXT,
  status TEXT DEFAULT 'Created',
  room_number TEXT,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  service_type TEXT,
  services TEXT,
  pax INT DEFAULT 1,
  image_url TEXT,
  is_test BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  qr_source_location TEXT,
  sync_status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Redemptions Table
CREATE TABLE IF NOT EXISTS redemptions (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  voucher_code TEXT REFERENCES vouchers(voucher_code),
  guest_name TEXT,
  service_type TEXT,
  room_number TEXT,
  email TEXT,
  whatsapp TEXT,
  weather TEXT
);

-- 3. Insights Table
CREATE TABLE IF NOT EXISTS insights (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  room_number TEXT,
  duration TEXT,
  reason TEXT
);

-- 4. Enable RLS (Security)
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Allow Public Read/Write for now, as per app logic)
-- Note: In production, you should tighten these with proper auth.
DROP POLICY IF EXISTS "Public Vouchers Read" ON vouchers;
CREATE POLICY "Public Vouchers Read" ON vouchers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Vouchers Insert" ON vouchers;
CREATE POLICY "Public Vouchers Insert" ON vouchers FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Vouchers Update" ON vouchers;
CREATE POLICY "Public Vouchers Update" ON vouchers FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Redemptions Read" ON redemptions;
CREATE POLICY "Public Redemptions Read" ON redemptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Redemptions Insert" ON redemptions;
CREATE POLICY "Public Redemptions Insert" ON redemptions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insights Insert" ON insights;
CREATE POLICY "Public Insights Insert" ON insights FOR INSERT WITH CHECK (true);
