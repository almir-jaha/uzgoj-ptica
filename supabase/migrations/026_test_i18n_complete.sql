-- Test sve tri migracije zajedno

-- Migracija 023: Višejezični nazivi za vrste ptica
DO $$
BEGIN

-- Ažuriraj Kanarinac boja
UPDATE vrsta_ptica
SET nazivi_jezicima = jsonb_build_object(
  'bs', 'Kanarinac boja',
  'hr', 'Kanarinac boja',
  'en', 'Color Canary',
  'de', 'Farbkanarien',
  'es', 'Canario de Color',
  'fr', 'Canari de Couleur',
  'it', 'Canarino di Colore',
  'nl', 'Kleurkanaarie',
  'pl', 'Kanarek Barwny',
  'sl', 'Kanareec barv',
  'sr', 'Kanarinca boja',
  'bg', 'Канарче с цвят',
  'hu', 'Szín kanári',
  'ro', 'Canarie de culoare',
  'pt', 'Canário de cor',
  'tr', 'Renk Kanarya',
  'zh', '彩色金丝雀'
)
WHERE naziv = 'Kanarinac boja';

-- Ažuriraj Kanarinac stasa
UPDATE vrsta_ptica
SET nazivi_jezicima = jsonb_build_object(
  'bs', 'Kanarinac stasa',
  'hr', 'Kanarinac stasa',
  'en', 'Type Canary',
  'de', 'Positurkanarien',
  'es', 'Canario de Postura',
  'fr', 'Canari de Posture',
  'it', 'Canarino di Tipo',
  'nl', 'Postuurkanaarie',
  'pl', 'Kanarek Typowy',
  'sl', 'Kanareec tip',
  'sr', 'Kanarinca stasa',
  'bg', 'Канарче тип',
  'hu', 'Tipuskanári',
  'ro', 'Canarie de tip',
  'pt', 'Canário de Tipo',
  'tr', 'Tip Kanarya',
  'zh', '类型金丝雀'
)
WHERE naziv = 'Kanarinac stasa';

-- Ažuriraj Kanarinac pjevač
UPDATE vrsta_ptica
SET nazivi_jezicima = jsonb_build_object(
  'bs', 'Kanarinac pjevač',
  'hr', 'Kanarinac pjevač',
  'en', 'Song Canary',
  'de', 'Gesangskanarien',
  'es', 'Canario de Canto',
  'fr', 'Canari Chanteur',
  'it', 'Canarino Cantore',
  'nl', 'Zangkanaarie',
  'pl', 'Kanarek Śpiewający',
  'sl', 'Kanareec певец',
  'sr', 'Kanarinca pjevač',
  'bg', 'Канарче певец',
  'hu', 'Éneklő kanári',
  'ro', 'Canarie de canto',
  'pt', 'Canário Cantor',
  'tr', 'Şarkı Kanarya',
  'zh', '歌唱金丝雀'
)
WHERE naziv = 'Kanarinac pjevač';

-- Ažuriraj Štiglić
UPDATE vrsta_ptica
SET nazivi_jezicima = jsonb_build_object(
  'bs', 'Štiglić',
  'hr', 'Štiglić',
  'en', 'European Goldfinch',
  'de', 'Distelfink',
  'es', 'Jilguero Europeo',
  'fr', 'Chardonneret Élégant',
  'it', 'Cardellino',
  'nl', 'Putse',
  'pl', 'Szczygieł',
  'sl', 'Čižem',
  'sr', 'Štilac',
  'bg', 'Щегол',
  'hu', 'Nyakvirág',
  'ro', 'Prepeliceaul',
  'pt', 'Pintassilgo-europeu',
  'tr', 'Avrupa Katırcısı',
  'zh', '欧洲金翅'
)
WHERE naziv = 'Štiglić';

-- Ažuriraj Zeba
UPDATE vrsta_ptica
SET nazivi_jezicima = jsonb_build_object(
  'bs', 'Zeba',
  'hr', 'Zeba',
  'en', 'Common Chaffinch',
  'de', 'Buchfink',
  'es', 'Pinzón Común',
  'fr', 'Pinson des Arbres',
  'it', 'Fringuello',
  'nl', 'Vink',
  'pl', 'Zięba',
  'sl', 'Čin',
  'sr', 'Čavka',
  'bg', 'Щур',
  'hu', 'Közönséges pintyfark',
  'ro', 'Cinteza',
  'pt', 'Tentilhão-comum',
  'tr', 'Çıkrık',
  'zh', '欧洲鸣鸟'
)
WHERE naziv = 'Zeba';

-- Ažuriraj Zelenac
UPDATE vrsta_ptica
SET nazivi_jezicima = jsonb_build_object(
  'bs', 'Zelenac',
  'hr', 'Zelenac',
  'en', 'European Greenfinch',
  'de', 'Grünfink',
  'es', 'Verderón Europeo',
  'fr', 'Verdier d''Europe',
  'it', 'Lucherino',
  'nl', 'Sijs',
  'pl', 'Szczygieł zwyczajny',
  'sl', 'Zelenjak',
  'sr', 'Zelenac',
  'bg', 'Зеленушка',
  'hu', 'Zöld pintyfark',
  'ro', 'Cinteza verde',
  'pt', 'Verdilhão-comum',
  'tr', 'Yeşil İspinoz',
  'zh', '欧洲金翅雀'
)
WHERE naziv = 'Zelenac';

END $$;

-- Migracija 024: Tabela za genetika polja sa prevodima
CREATE TABLE IF NOT EXISTS genetika_polja_i18n (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  polje_kljuc TEXT NOT NULL,
  vrsta_grupa TEXT NOT NULL,
  tip TEXT NOT NULL CHECK (tip IN ('select', 'text', 'tags', 'stars', 'number')),
  sekcija TEXT NOT NULL CHECK (sekcija IN ('genetika', 'ocjena')),
  redoslijed INTEGER NOT NULL DEFAULT 0,
  nazivi_jezicima JSONB NOT NULL DEFAULT '{}',
  opisi_jezicima JSONB DEFAULT '{}',
  opcije JSONB DEFAULT '[]',
  placeholder_jezicima JSONB DEFAULT '{}',
  min_vrijednost INTEGER,
  max_vrijednost INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(polje_kljuc, vrsta_grupa)
);

CREATE INDEX IF NOT EXISTS idx_genetika_polja_grupa ON genetika_polja_i18n(vrsta_grupa);
CREATE INDEX IF NOT EXISTS idx_genetika_polja_kljuc ON genetika_polja_i18n(polje_kljuc);

ALTER TABLE genetika_polja_i18n ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "genetika_polja_admin_write" ON genetika_polja_i18n
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid() AND (raw_user_meta_data->>'je_admin')::boolean = true
    )
  );

CREATE POLICY IF NOT EXISTS "genetika_polja_read" ON genetika_polja_i18n
  FOR SELECT
  USING (true);

-- Migracija 025: Seed podataka
DO $$
BEGIN

-- 1. vizuelna_mutacija
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, placeholder_jezicima)
VALUES ('vizuelna_mutacija', 'kanarinac_finke', 'text', 'genetika', 1,
  jsonb_build_object('bs', 'Mutacija', 'hr', 'Mutacija', 'en', 'Mutation', 'de', 'Mutation', 'es', 'Mutación', 'fr', 'Mutation', 'it', 'Mutazione', 'nl', 'Mutatie', 'pl', 'Mutacja', 'sl', 'Mutacija', 'sr', 'Mutacija', 'bg', 'Мутация', 'hu', 'Mutáció', 'ro', 'Mutație', 'pt', 'Mutação', 'tr', 'Mutasyon', 'zh', '突变'),
  jsonb_build_object('bs', 'npr. Lutino, Opal...', 'hr', 'npr. Lutino, Opal...', 'en', 'e.g. Lutino, Opal...', 'de', 'z.B. Lutino, Opal...', 'es', 'p.ej. Lutino, Opal...', 'fr', 'p.ex. Lutino, Opal...', 'it', 'es. Lutino, Opal...', 'nl', 'bijv. Lutino, Opal...', 'pl', 'np. Lutino, Opal...', 'sl', 'npr. Lutino, Opal...', 'sr', 'npr. Lutino, Opal...', 'bg', 'напр. Lutino, Opal...', 'hu', 'pl. Lutino, Opal...', 'ro', 'de ex. Lutino, Opal...', 'pt', 'ex. Lutino, Opal...', 'tr', 'örn. Lutino, Opal...', 'zh', '如 Lutino, Opal...'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 2. skrivena_mutacija
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima)
VALUES ('skrivena_mutacija', 'kanarinac_finke', 'tags', 'genetika', 2,
  jsonb_build_object('bs', 'Skrivena mutacija (Split /…/)', 'hr', 'Skrivena mutacija (Split /…/)', 'en', 'Hidden mutation (Split /…/)', 'de', 'Versteckte Mutation (Split /…/)', 'es', 'Mutación oculta (Split /…/)', 'fr', 'Mutation cachée (Split /…/)', 'it', 'Mutazione nascosta (Split /…/)', 'nl', 'Verborgen mutatie (Split /…/)', 'pl', 'Ukryta mutacja (Split /…/)', 'sl', 'Skrita mutacija (Split /…/)', 'sr', 'Skrivena mutacija (Split /…/)', 'bg', 'Скрита мутация (Split /…/)', 'hu', 'Rejtett mutáció (Split /…/)', 'ro', 'Mutație ascunsă (Split /…/)', 'pt', 'Mutação oculta (Split /…/)', 'tr', 'Gizli mutasyon (Split /…/)', 'zh', '隐性突变 (Split /…/)'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 3. stav
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima)
VALUES ('stav', 'kanarinac_finke', 'select', 'genetika', 3,
  jsonb_build_object('bs', 'Stav i držanje', 'hr', 'Stav i držanje', 'en', 'Posture and bearing', 'de', 'Haltung und Körperbau', 'es', 'Postura y porte', 'fr', 'Port et allure', 'it', 'Postura e portamento', 'nl', 'Houding en voorkomen', 'pl', 'Postawa i budowa', 'sl', 'Drza in dranje', 'sr', 'Stav i dranje', 'bg', 'Стойност и държание', 'hu', 'Tartás és járás', 'ro', 'Postură si purtare', 'pt', 'Postura e porte', 'tr', 'Tutum ve davranis', 'zh', '姿态和举止'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 4. kategorija_pjesme
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima)
VALUES ('kategorija_pjesme', 'kanarinac_finke', 'select', 'genetika', 4,
  jsonb_build_object('bs', 'Kategorija pjesme', 'hr', 'Kategorija pjesme', 'en', 'Song category', 'de', 'Liedkategorie', 'es', 'Categoría de canción', 'fr', 'Catégorie de chanson', 'it', 'Categoria di canto', 'nl', 'Zangcategorie', 'pl', 'Kategorija pesme', 'sl', 'Kategorija pesmi', 'sr', 'Kategorija pesme', 'bg', 'Категория на песен', 'hu', 'Énektónus kategória', 'ro', 'Categoria cântecului', 'pt', 'Categoria de cancao', 'tr', 'Sarki kategorisi', 'zh', '歌曲类别'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 5. duzina_cm
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, min_vrijednost, max_vrijednost, placeholder_jezicima)
VALUES ('duzina_cm', 'kanarinac_finke', 'number', 'genetika', 5,
  jsonb_build_object('bs', 'Dužina tijela (cm)', 'hr', 'Dužina tijela (cm)', 'en', 'Body length (cm)', 'de', 'Körperlänge (cm)', 'es', 'Largo corporal (cm)', 'fr', 'Longueur du corps (cm)', 'it', 'Lunghezza corporea (cm)', 'nl', 'Lichaamlengte (cm)', 'pl', 'Długość ciała (cm)', 'sl', 'Dolzina telesa (cm)', 'sr', 'Duzina tela (cm)', 'bg', 'Дължина на тялото (см)', 'hu', 'Vücut uzunlugu (cm)', 'ro', 'Lungimea corpului (cm)', 'pt', 'Comprimento do corpo (cm)', 'tr', 'Vücut uzunlugu (cm)', 'zh', '身体长度 (厘米)'),
  8, 25,
  jsonb_build_object('bs', 'npr. 14', 'hr', 'npr. 14', 'en', 'e.g. 14', 'de', 'z.B. 14', 'es', 'p.ej. 14', 'fr', 'p.ex. 14', 'it', 'es. 14', 'nl', 'bijv. 14', 'pl', 'np. 14', 'sl', 'npr. 14', 'sr', 'npr. 14', 'bg', 'напр. 14', 'hu', 'pl. 14', 'ro', 'de ex. 14', 'pt', 'ex. 14', 'tr', 'örn. 14', 'zh', '如 14'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 6. ocjena_stav
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, min_vrijednost, max_vrijednost)
VALUES ('ocjena_stav', 'kanarinac_finke', 'stars', 'ocjena', 6,
  jsonb_build_object('bs', 'Stav i konstitucija', 'hr', 'Stav i konstitucija', 'en', 'Posture and build', 'de', 'Haltung und Körperbau', 'es', 'Postura y constitución', 'fr', 'Port et constitution', 'it', 'Postura e costituzione', 'nl', 'Houding en constitutie', 'pl', 'Postawa i budowa', 'sl', 'Drza in konstitucija', 'sr', 'Stav i konstitucija', 'bg', 'Стойност и конституция', 'hu', 'Tartás és konstitúció', 'ro', 'Postură si constitutie', 'pt', 'Postura e constituição', 'tr', 'Tutum ve konstitüsyon', 'zh', '姿态和体格'),
  1, 5)
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 7. ocjena_perje
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, min_vrijednost, max_vrijednost)
VALUES ('ocjena_perje', 'kanarinac_finke', 'stars', 'ocjena', 7,
  jsonb_build_object('bs', 'Kvalitet perja', 'hr', 'Kvalitet perja', 'en', 'Feather quality', 'de', 'Federqualität', 'es', 'Calidad del plumaje', 'fr', 'Qualité du plumage', 'it', 'Qualità del piumaggio', 'nl', 'Veerkwaliteit', 'pl', 'Jakość piór', 'sl', 'Kakovost perja', 'sr', 'Kvalitet perja', 'bg', 'Качество на пера', 'hu', 'Tüy kalitesi', 'ro', 'Calitatea penelor', 'pt', 'Qualidade da plumagem', 'tr', 'Tüy kalitesi', 'zh', '羽毛质量'),
  1, 5)
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 8. boja_perja
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, placeholder_jezicima)
VALUES ('boja_perja', 'kanarinac_finke', 'text', 'genetika', 8,
  jsonb_build_object('bs', 'Boja perja', 'hr', 'Boja perja', 'en', 'Feather color', 'de', 'Federfarbe', 'es', 'Color de plumaje', 'fr', 'Couleur du plumage', 'it', 'Colore del piumaggio', 'nl', 'Verenkleur', 'pl', 'Kolor piór', 'sl', 'Barva perja', 'sr', 'Boja perja', 'bg', 'Цвят на пера', 'hu', 'Tüy szína', 'ro', 'Culoarea penelor', 'pt', 'Cor da plumagem', 'tr', 'Tüy rengi', 'zh', '羽毛颜色'),
  jsonb_build_object('bs', 'npr. Žuta, Bijela...', 'hr', 'npr. Žuta, Bijela...', 'en', 'e.g. Yellow, White...', 'de', 'z.B. Gelb, Weiss...', 'es', 'p.ej. Amarillo, Blanco...', 'fr', 'p.ex. Jaune, Blanc...', 'it', 'es. Giallo, Bianco...', 'nl', 'bijv. Geel, Wit...', 'pl', 'np. Żółty, Biały...', 'sl', 'npr. Rumen, Bel...', 'sr', 'npr. Žuta, Bijela...', 'bg', 'напр. Жълто, Бяло...', 'hu', 'pl. Sárga, Fehér...', 'ro', 'de ex. Galben, Alb...', 'pt', 'ex. Amarelo, Branco...', 'tr', 'örn. Sarı, Beyaz...', 'zh', '如 黄色、白色...'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 9. tip_oka
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima)
VALUES ('tip_oka', 'kanarinac_finke', 'select', 'genetika', 9,
  jsonb_build_object('bs', 'Tip oka', 'hr', 'Tip oka', 'en', 'Eye type', 'de', 'Augentyp', 'es', 'Tipo de ojo', 'fr', 'Type d''oeil', 'it', 'Tipo di occhio', 'nl', 'Oogtype', 'pl', 'Typ oka', 'sl', 'Tip oka', 'sr', 'Tip oka', 'bg', 'Тип очи', 'hu', 'Szem típus', 'ro', 'Tip de ochi', 'pt', 'Tipo de olho', 'tr', 'Göz tipi', 'zh', '眼睛类型'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 10. specijalizacija
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima)
VALUES ('specijalizacija', 'kanarinac_finke', 'select', 'genetika', 10,
  jsonb_build_object('bs', 'Specijalizacija', 'hr', 'Specijalizacija', 'en', 'Specialization', 'de', 'Spezialisierung', 'es', 'Especialización', 'fr', 'Spécialisation', 'it', 'Specializzazione', 'nl', 'Specialisatie', 'pl', 'Specjalizacja', 'sl', 'Specijalizacija', 'sr', 'Specijalizacija', 'bg', 'Специализация', 'hu', 'Specializáció', 'ro', 'Specializare', 'pt', 'Especialização', 'tr', 'Uzmanlaşma', 'zh', '专业化'))
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 11. stil_leta
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, min_vrijednost, max_vrijednost)
VALUES ('stil_leta', 'kanarinac_finke', 'stars', 'ocjena', 11,
  jsonb_build_object('bs', 'Stil leta', 'hr', 'Stil leta', 'en', 'Flight style', 'de', 'Flugstil', 'es', 'Estilo de vuelo', 'fr', 'Style de vol', 'it', 'Stile di volo', 'nl', 'Vliegstijl', 'pl', 'Styl lotu', 'sl', 'Stil letenja', 'sr', 'Stil leta', 'bg', 'Стил на полета', 'hu', 'Repülési stílus', 'ro', 'Stil de zbor', 'pt', 'Estilo de voo', 'tr', 'Uçuş stili', 'zh', '飞行风格'),
  1, 5)
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 12. ocjena_orijentacija
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, min_vrijednost, max_vrijednost)
VALUES ('ocjena_orijentacija', 'kanarinac_finke', 'stars', 'ocjena', 12,
  jsonb_build_object('bs', 'Orijentacija', 'hr', 'Orijentacija', 'en', 'Orientation', 'de', 'Ausrichtung', 'es', 'Orientación', 'fr', 'Orientation', 'it', 'Orientamento', 'nl', 'Oriëntatie', 'pl', 'Orientacja', 'sl', 'Orientacija', 'sr', 'Orijentacija', 'bg', 'Ориентация', 'hu', 'Orientáció', 'ro', 'Orientare', 'pt', 'Orientação', 'tr', 'Yönelim', 'zh', '方向'),
  1, 5)
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

-- 13. ocjena_konstitucija
INSERT INTO genetika_polja_i18n (polje_kljuc, vrsta_grupa, tip, sekcija, redoslijed, nazivi_jezicima, min_vrijednost, max_vrijednost)
VALUES ('ocjena_konstitucija', 'kanarinac_finke', 'stars', 'ocjena', 13,
  jsonb_build_object('bs', 'Konstitucija', 'hr', 'Konstitucija', 'en', 'Constitution', 'de', 'Konstitution', 'es', 'Constitución', 'fr', 'Constitution', 'it', 'Costituzione', 'nl', 'Constitutie', 'pl', 'Konstytucja', 'sl', 'Konstitucija', 'sr', 'Konstitucija', 'bg', 'Конституция', 'hu', 'Konstitúció', 'ro', 'Constitutie', 'pt', 'Constituição', 'tr', 'Anayasa', 'zh', '构成'),
  1, 5)
ON CONFLICT (polje_kljuc, vrsta_grupa) DO NOTHING;

END $$;

-- Verifikacija: prikaži sve unete genetika polja
SELECT COUNT(*) as total_fields FROM genetika_polja_i18n;

SELECT
  polje_kljuc,
  vrsta_grupa,
  COUNT(DISTINCT jsonb_object_keys(nazivi_jezicima)) as languages
FROM genetika_polja_i18n
GROUP BY polje_kljuc, vrsta_grupa
ORDER BY redoslijed;
