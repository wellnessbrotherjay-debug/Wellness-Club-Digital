-- Add Schedule Table for Class Management
CREATE TABLE IF NOT EXISTS schedule (
    id BIGSERIAL PRIMARY KEY,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    class_name TEXT NOT NULL,
    time TEXT NOT NULL CHECK (time ~ '^[0-9]{2}:[0-9]{2} - [0-9]{2}:[0-9]{2}$'),
    coach TEXT DEFAULT '',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule(day);
CREATE INDEX IF NOT EXISTS idx_schedule_class ON schedule(class_name);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON schedule(status);

-- Enable RLS (Row Level Security)
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (as per app requirements)
DROP POLICY IF EXISTS "Public Schedule Read" ON schedule;
CREATE POLICY "Public Schedule Read" ON schedule FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Schedule Insert" ON schedule;
CREATE POLICY "Public Schedule Insert" ON schedule FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Schedule Update" ON schedule;
CREATE POLICY "Public Schedule Update" ON schedule FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Schedule Delete" ON schedule;
CREATE POLICY "Public Schedule Delete" ON schedule FOR DELETE USING (true);

-- Add a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON schedule;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON schedule
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();