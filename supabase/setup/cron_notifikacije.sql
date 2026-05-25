-- ═══════════════════════════════════════════════════════════════
-- SETUP: Dnevni cron za push notifikacije aktivnosti
-- ═══════════════════════════════════════════════════════════════
-- Pokrenuti jednom u Supabase Dashboard → SQL Editor
--
-- Preduvjeti:
--   1. Uključi ekstenzije: Database → Extensions → pg_cron + pg_net
--   2. Deployaj Edge Function: supabase functions deploy provjeri-aktivnosti
--   3. Postavi Supabase Secrets:
--        VAPID_PUBLIC_KEY   = <tvoj VAPID public key>
--        VAPID_PRIVATE_KEY  = <tvoj VAPID private key>
--        VAPID_EMAIL        = mailto:almir.jaha@gmail.com
--        CRON_SECRET        = <neki random string, npr. openssl rand -base64 32>
--   4. Zamijeni URL i SERVICE_ROLE_KEY ispod
-- ═══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'provjeri-aktivnosti-dnevno',
  '0 7 * * *',  -- svaki dan u 07:00 UTC (09:00 po ljetnjem vremenu)
  $$
  SELECT net.http_post(
    url        := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/provjeri-aktivnosti',
    headers    := jsonb_build_object(
                    'Content-Type',  'application/json',
                    'Authorization', 'Bearer YOUR_CRON_SECRET'
                  ),
    body       := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Provjeri da je cron registriran:
-- SELECT * FROM cron.job;

-- Ručno pokreni (za test):
-- SELECT cron.run_job('provjeri-aktivnosti-dnevno');

-- Ukloni cron (ako treba):
-- SELECT cron.unschedule('provjeri-aktivnosti-dnevno');
