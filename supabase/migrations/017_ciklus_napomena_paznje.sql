-- Vanredna pažnja na kavezu (bolest, liječenje...) — vezano za aktivni ciklus
ALTER TABLE ciklusi ADD COLUMN IF NOT EXISTS napomena_paznje TEXT;
