ALTER TABLE zdravlje ADD COLUMN IF NOT EXISTS sezona_id UUID REFERENCES sezona(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_zdravlje_sezona_id ON zdravlje(sezona_id);
