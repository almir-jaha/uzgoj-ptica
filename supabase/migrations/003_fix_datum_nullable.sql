-- datum u aktivnosti_ciklusa treba biti nullable:
-- NULL = aktivnost još nije obavljena, DATE = datum obavljanja
ALTER TABLE aktivnosti_ciklusa
  ALTER COLUMN datum DROP NOT NULL;
