-- Migracija 028: Dodaj višejezični naziv fazama uzgoja
-- Admini sada mogu unositi nazive faza na svim podržanim jezicima

ALTER TABLE faze_ciklusa
  ADD COLUMN IF NOT EXISTS nazivi_jezicima JSONB DEFAULT '{}';

-- Popuni bs prevod iz postojećeg naziva za sve faze
UPDATE faze_ciklusa
SET nazivi_jezicima = jsonb_build_object('bs', naziv)
WHERE nazivi_jezicima IS NULL OR nazivi_jezicima = '{}';
