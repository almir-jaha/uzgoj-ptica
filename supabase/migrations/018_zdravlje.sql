-- Zdravstveni dnevnik ptica
-- ptica_id = null + uzgajivacnica_id = masovni tretman (sve ptice uzgajivačnice)
-- ptica_id = uuid = tretman za konkretnu pticu

CREATE TABLE IF NOT EXISTS zdravlje (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uzgajivacnica_id UUID REFERENCES uzgajivacnice(id) ON DELETE SET NULL,
  ptica_id         UUID REFERENCES ptice(id) ON DELETE CASCADE,
  datum            DATE NOT NULL DEFAULT CURRENT_DATE,
  tip              TEXT NOT NULL CHECK (tip IN ('bolest','preventiva','vakcinacija','zapazanje','ostalo')),
  naziv            TEXT NOT NULL,
  opis             TEXT,
  lijek            TEXT,
  trajanje_dana    INTEGER,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE zdravlje ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_manages_zdravlje"
  ON zdravlje FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON zdravlje TO authenticated;

CREATE INDEX idx_zdravlje_ptica_id        ON zdravlje(ptica_id);
CREATE INDEX idx_zdravlje_uzgajivacnica   ON zdravlje(uzgajivacnica_id);
CREATE INDEX idx_zdravlje_datum           ON zdravlje(datum DESC);
