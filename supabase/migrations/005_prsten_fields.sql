-- Dodaj redni broj prstena na ptice
ALTER TABLE ptice ADD COLUMN IF NOT EXISTS prsten_redni_broj INTEGER;

-- Postavke korisnika (prefiks prstena i sl.)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prsten_prefiks TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Korisnik upravlja samo svojim postavkama"
  ON user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON user_settings TO authenticated;
