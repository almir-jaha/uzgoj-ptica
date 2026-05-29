-- Sistem nivoa korisnika (tier) za buduću pretplatu
-- Admin može mijenjati tier svakog korisnika

CREATE TABLE IF NOT EXISTS user_tiers (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email    TEXT NOT NULL,
  tier     TEXT NOT NULL DEFAULT 'free'
             CHECK (tier IN ('free', 'paid_1', 'paid_2', 'paid_3', 'admin')),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

ALTER TABLE user_tiers ENABLE ROW LEVEL SECURITY;

-- Korisnik čita samo svoju tier
CREATE POLICY "user_reads_own_tier"
  ON user_tiers FOR SELECT
  USING (auth.uid() = user_id);

-- Korisnik sam upisuje svoju tier pri prvom loginu (samo INSERT, ne UPDATE)
CREATE POLICY "user_inserts_own_tier"
  ON user_tiers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin čita sve tierove
CREATE POLICY "admin_reads_all_tiers"
  ON user_tiers FOR SELECT
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com');

-- Admin mijenja sve tierove
CREATE POLICY "admin_manages_all_tiers"
  ON user_tiers FOR ALL
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com')
  WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com');

GRANT SELECT, INSERT ON user_tiers TO authenticated;
GRANT UPDATE (tier, updated_at, updated_by) ON user_tiers TO authenticated;

-- Admin može čitati i ažurirati sve uzgajivačnice (posebno app_url)
CREATE POLICY "admin_reads_all_uzgajivacnice"
  ON uzgajivacnice FOR SELECT
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com');

CREATE POLICY "admin_updates_all_uzgajivacnice"
  ON uzgajivacnice FOR UPDATE
  USING ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com')
  WITH CHECK ((SELECT email FROM auth.users WHERE id = auth.uid()) = 'almir.jaha@gmail.com');

-- Postavi admina na admin tier
INSERT INTO user_tiers (user_id, email, tier)
SELECT id, email, 'admin'
FROM auth.users
WHERE email = 'almir.jaha@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET tier = 'admin';
