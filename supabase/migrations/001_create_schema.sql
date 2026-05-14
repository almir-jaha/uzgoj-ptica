-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: vrsta_ptica (šifarnik - svi imaju pristup)
CREATE TABLE IF NOT EXISTS vrsta_ptica (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  naziv TEXT NOT NULL,
  naziv_latinskih_imena TEXT[],
  nazivi_jezicima JSONB DEFAULT '{}',
  podatci_inkubacija JSONB DEFAULT '{}',
  napomena TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: ptice (globalne po korisniku - KEY: user_id FK, otac_id/majka_id self-ref)
CREATE TABLE IF NOT EXISTS ptice (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vrsta_ptica_id UUID NOT NULL REFERENCES vrsta_ptica(id),
  spol TEXT CHECK (spol IN ('M', 'Ž', '?')),
  prstena_oznaka TEXT,
  naziv TEXT,
  otac_id UUID REFERENCES ptice(id) ON DELETE SET NULL,
  majka_id UUID REFERENCES ptice(id) ON DELETE SET NULL,
  datum_rodjenja DATE,
  napomena TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: sezona
CREATE TABLE IF NOT EXISTS sezona (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  godina INTEGER NOT NULL,
  naziv TEXT,
  broj_kaveza INTEGER NOT NULL,
  datum_pocetka DATE NOT NULL,
  datum_kraja DATE,
  status TEXT DEFAULT 'aktiva' CHECK (status IN ('aktiva', 'završena')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: vrsta_vrsta_faze (šifarnik faza po vrsti)
CREATE TABLE IF NOT EXISTS faze_ciklusa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vrsta_ptica_id UUID NOT NULL REFERENCES vrsta_ptica(id) ON DELETE CASCADE,
  redoslijed INTEGER NOT NULL,
  naziv TEXT NOT NULL,
  boja TEXT NOT NULL,
  broj_dana INTEGER NOT NULL,
  opis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: kavezi
CREATE TABLE IF NOT EXISTS kavezi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sezona_id UUID NOT NULL REFERENCES sezona(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oznaka INTEGER NOT NULL,
  trenutna_faza_id UUID REFERENCES faze_ciklusa(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'prazan' CHECK (status IN ('prazan', 'aktivan', 'alarm')),
  napomena TEXT,
  updated_from BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sezona_id, oznaka)
);

-- Tabela: parovi (KEY: ptica1_id, ptica2_id su FK na ptice.id - ista ptica može biti u više parova kroz godine)
CREATE TABLE IF NOT EXISTS parovi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sezona_id UUID NOT NULL REFERENCES sezona(id) ON DELETE CASCADE,
  ptica1_id UUID NOT NULL REFERENCES ptice(id) ON DELETE CASCADE,
  ptica2_id UUID NOT NULL REFERENCES ptice(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'aktivan' CHECK (status IN ('aktivan', 'završen', 'razdvojen')),
  datum_formiranja DATE NOT NULL,
  napomena TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: ciklusi (legla)
CREATE TABLE IF NOT EXISTS ciklusi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  par_id UUID NOT NULL REFERENCES parovi(id) ON DELETE CASCADE,
  kavez_id UUID NOT NULL REFERENCES kavezi(id) ON DELETE CASCADE,
  sezona_id UUID NOT NULL REFERENCES sezona(id) ON DELETE CASCADE,
  vrsta_ptica_id UUID NOT NULL REFERENCES vrsta_ptica(id),
  datum_prvog_jajeta DATE NOT NULL,
  status TEXT DEFAULT 'aktivan' CHECK (status IN ('aktivan', 'završen', 'neuspješan')),
  broj_jaja INTEGER,
  broj_izlijegljenih INTEGER,
  napomena TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: aktivnosti_ciklusa
CREATE TABLE IF NOT EXISTS aktivnosti_ciklusa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ciklus_id UUID NOT NULL REFERENCES ciklusi(id) ON DELETE CASCADE,
  faza_id UUID NOT NULL REFERENCES faze_ciklusa(id),
  datum DATE NOT NULL,
  potreban_datum DATE NOT NULL,
  napomena TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: istorija (archive)
CREATE TABLE IF NOT EXISTS istorija (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sezona_id UUID NOT NULL REFERENCES sezona(id) ON DELETE CASCADE,
  kavez_id UUID REFERENCES kavezi(id) ON DELETE SET NULL,
  par_id UUID REFERENCES parovi(id) ON DELETE SET NULL,
  ciklus_id UUID REFERENCES ciklusi(id) ON DELETE SET NULL,
  tip_entiteta TEXT CHECK (tip_entiteta IN ('sezona', 'kavez', 'par', 'ciklus')),
  data_snapshot JSONB,
  datum_arhiva TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ptice_user_id ON ptice(user_id);
CREATE INDEX idx_ptice_otac_id ON ptice(otac_id);
CREATE INDEX idx_ptice_majka_id ON ptice(majka_id);
CREATE INDEX idx_sezona_user_id ON sezona(user_id);
CREATE INDEX idx_kavezi_sezona_id ON kavezi(sezona_id);
CREATE INDEX idx_kavezi_user_id ON kavezi(user_id);
CREATE INDEX idx_kavezi_status ON kavezi(status);
CREATE INDEX idx_faze_vrsta_id ON faze_ciklusa(vrsta_ptica_id);
CREATE INDEX idx_parovi_sezona_id ON parovi(sezona_id);
CREATE INDEX idx_parovi_ptica1_id ON parovi(ptica1_id);
CREATE INDEX idx_parovi_ptica2_id ON parovi(ptica2_id);
CREATE INDEX idx_parovi_status ON parovi(status);
CREATE INDEX idx_ciklusi_kavez_id ON ciklusi(kavez_id);
CREATE INDEX idx_ciklusi_par_id ON ciklusi(par_id);
CREATE INDEX idx_ciklusi_sezona_id ON ciklusi(sezona_id);
CREATE INDEX idx_ciklusi_status ON ciklusi(status);
CREATE INDEX idx_aktivnosti_ciklus_id ON aktivnosti_ciklusa(ciklus_id);
CREATE INDEX idx_aktivnosti_faza_id ON aktivnosti_ciklusa(faza_id);
CREATE INDEX idx_istorija_sezona_id ON istorija(sezona_id);

-- RLS Policies
ALTER TABLE ptice ENABLE ROW LEVEL SECURITY;
ALTER TABLE sezona ENABLE ROW LEVEL SECURITY;
ALTER TABLE kavezi ENABLE ROW LEVEL SECURITY;
ALTER TABLE parovi ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciklusi ENABLE ROW LEVEL SECURITY;
ALTER TABLE aktivnosti_ciklusa ENABLE ROW LEVEL SECURITY;
ALTER TABLE istorija ENABLE ROW LEVEL SECURITY;

-- RLS: ptice - korisnik vidi samo svoje
CREATE POLICY ptice_auth_policy ON ptice
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: sezona - korisnik vidi samo svoje
CREATE POLICY sezona_auth_policy ON sezona
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS: kavezi - preko sezona.user_id
CREATE POLICY kavezi_auth_policy ON kavezi
  FOR ALL USING (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  );

-- RLS: parovi - preko sezona.user_id
CREATE POLICY parovi_auth_policy ON parovi
  FOR ALL USING (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  );

-- RLS: ciklusi - preko sezona.user_id
CREATE POLICY ciklusi_auth_policy ON ciklusi
  FOR ALL USING (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  );

-- RLS: aktivnosti_ciklusa - preko ciklusa
CREATE POLICY aktivnosti_ciklusa_auth_policy ON aktivnosti_ciklusa
  FOR ALL USING (
    ciklus_id IN (
      SELECT id FROM ciklusi WHERE sezona_id IN (
        SELECT id FROM sezona WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    ciklus_id IN (
      SELECT id FROM ciklusi WHERE sezona_id IN (
        SELECT id FROM sezona WHERE user_id = auth.uid()
      )
    )
  );

-- RLS: istorija - korisnik vidi samo svoje
CREATE POLICY istorija_auth_policy ON istorija
  FOR ALL USING (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    sezona_id IN (
      SELECT id FROM sezona WHERE user_id = auth.uid()
    )
  );

-- Grants
GRANT SELECT ON vrsta_ptica TO authenticated;
GRANT ALL ON ptice TO authenticated;
GRANT ALL ON sezona TO authenticated;
GRANT ALL ON faze_ciklusa TO authenticated;
GRANT ALL ON kavezi TO authenticated;
GRANT ALL ON parovi TO authenticated;
GRANT ALL ON ciklusi TO authenticated;
GRANT ALL ON aktivnosti_ciklusa TO authenticated;
GRANT ALL ON istorija TO authenticated;
