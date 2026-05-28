-- Javni pristup za skeniranje QR koda (ptica profil stranica)
-- Anon korisnici (neautentificirani) mogu čitati podatke o pticama

-- ptice: anon može čitati sve (za javni profil ptice)
CREATE POLICY "anon_read_ptice"
  ON ptice FOR SELECT TO anon
  USING (true);

GRANT SELECT ON ptice TO anon;

-- vrsta_ptica: javni šifarnik, dostupan svima
GRANT SELECT ON vrsta_ptica TO anon;

-- user_settings: anon može čitati podatke uzgajivača (naziv, kontakt)
CREATE POLICY "anon_read_user_settings"
  ON user_settings FOR SELECT TO anon
  USING (true);

GRANT SELECT ON user_settings TO anon;
