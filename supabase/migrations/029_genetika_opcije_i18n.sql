-- Migracija 029: Dodaj višejezične opcije na genetička polja
-- opcije_jezicima: { "bs": ["Lutino","Albino"], "en": ["Lutino","Albino"], ... }

ALTER TABLE genetika_polja_i18n
  ADD COLUMN IF NOT EXISTS opcije_jezicima JSONB DEFAULT '{}';

-- Popuni BS vrijednosti iz postojeće opcije kolone
UPDATE genetika_polja_i18n
SET opcije_jezicima = jsonb_build_object('bs', opcije)
WHERE opcije IS NOT NULL
  AND jsonb_array_length(opcije::jsonb) > 0
  AND (opcije_jezicima IS NULL OR opcije_jezicima = '{}');
