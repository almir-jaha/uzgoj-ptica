-- URL aplikacije za QR kodove na rodovnicima (admin može promijeniti ako se promijeni domena)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS app_url TEXT;
