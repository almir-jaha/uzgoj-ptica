-- Migracija 023: Višejezični nazivi za vrste ptica
-- Dodaje prevode za sve 17 jezika na postojeće vrste ptica

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
