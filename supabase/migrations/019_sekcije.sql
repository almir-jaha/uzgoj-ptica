-- Sekcije: prostorna podjela unutar uzgajivačnice (boksovi, prostorije, sobe)
CREATE TABLE IF NOT EXISTS sekcije (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uzgajivacnica_id UUID NOT NULL REFERENCES uzgajivacnice(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  naziv TEXT NOT NULL,
  opis TEXT,
  kapacitet_kaveza INTEGER,
  redoslijed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sekcije ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vlasnik upravlja sekcijama" ON sekcije
  FOR ALL USING (auth.uid() = user_id);

-- Opcionalna veza kaveza → sekcija (SET NULL pri brisanju sekcije)
ALTER TABLE kavezi ADD COLUMN IF NOT EXISTS sekcija_id UUID REFERENCES sekcije(id) ON DELETE SET NULL;
