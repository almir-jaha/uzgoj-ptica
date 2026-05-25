// Supabase Edge Function — dnevna provjera aktivnosti ciklusa i slanje push notifikacija
// Pokreće se svaki dan u 7:00 via pg_cron + pg_net (vidi supabase/setup/cron_notifikacije.sql)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
const vapidEmail = Deno.env.get('VAPID_EMAIL') ?? 'mailto:admin@uzgojptica.app';

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

const db = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
	// Provjera Authorization headera za sigurnost
	const auth = req.headers.get('Authorization');
	const secret = Deno.env.get('CRON_SECRET');
	if (secret && auth !== `Bearer ${secret}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Tijelo može sadržavati:
	//   { test_user_id, test_title?, test_body? }  — pošalji test push korisniku
	//   { force_date: "YYYY-MM-DD" }               — koristi taj datum umjesto danas
	let body: Record<string, string> = {};
	try { body = await req.json(); } catch { /* prazan body */ }

	// Test mode: direktan push na uređaj korisnika
	if (body.test_user_id) {
		const { data: subs } = await db
			.from('push_subscriptions')
			.select('endpoint, p256dh, auth')
			.eq('user_id', body.test_user_id);

		if (!subs?.length) {
			return new Response(JSON.stringify({ error: 'Nema push subscriptions za ovog korisnika' }), {
				status: 404, headers: { 'Content-Type': 'application/json' }
			});
		}

		const payload = JSON.stringify({
			title: body.test_title ?? '🧪 Test — Uzgoj ptica',
			body: body.test_body ?? 'Push notifikacije rade ispravno!',
			url: '/aktivnosti',
			tag: 'uzgoj-test',
			hitnost: 'danas'
		});

		let sent = 0;
		for (const sub of subs) {
			try {
				await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
				sent++;
			} catch (err) {
				console.error('Test push failed:', (err as Error).message);
			}
		}
		return new Response(JSON.stringify({ test: true, sent, devices: subs.length }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const refDate = body.force_date ? new Date(body.force_date) : new Date();
	const today = refDate.toISOString().split('T')[0];
	const tomorrow = new Date(refDate.getTime() + 86_400_000).toISOString().split('T')[0];

	// Dohvati sve aktivnosti koje dospijevaju danas ili sutra, a nisu obavljene
	const { data: rows, error: qErr } = await db
		.from('aktivnosti_ciklusa')
		.select(`
      id,
      potreban_datum,
      faza:faza_id ( naziv ),
      ciklus:ciklus_id (
        status,
        kavez_id,
        sezona:sezona_id ( user_id )
      )
    `)
		.in('potreban_datum', [today, tomorrow])
		.is('datum', null);

	if (qErr) {
		console.error('Query error:', qErr.message);
		return new Response(JSON.stringify({ error: qErr.message }), { status: 500 });
	}

	// Grupiraj po user_id, samo aktivni ciklusi
	type Row = (typeof rows)[0];
	const byUser = new Map<string, Row[]>();

	for (const row of rows ?? []) {
		const ciklus = row.ciklus as { status: string; sezona: { user_id: string } } | null;
		if (ciklus?.status !== 'aktivan') continue;
		const userId = ciklus?.sezona?.user_id;
		if (!userId) continue;
		if (!byUser.has(userId)) byUser.set(userId, []);
		byUser.get(userId)!.push(row);
	}

	const result = { sent: 0, failed: 0, expired_removed: 0, users: byUser.size };

	for (const [userId, aktivnosti] of byUser) {
		// Dohvati push subscriptions za ovog korisnika
		const { data: subs } = await db
			.from('push_subscriptions')
			.select('endpoint, p256dh, auth')
			.eq('user_id', userId);

		if (!subs?.length) continue;

		// Sastavi poruku
		const danasAkt = aktivnosti.filter((a) => a.potreban_datum === today);
		const sutraAkt = aktivnosti.filter((a) => a.potreban_datum === tomorrow);

		let title = 'Uzgoj ptica';
		let body = '';

		if (danasAkt.length > 0 && sutraAkt.length > 0) {
			const ukupno = danasAkt.length + sutraAkt.length;
			title = `⚠ ${ukupno} aktivnosti čekaju`;
			body = `${danasAkt.length} danas · ${sutraAkt.length} sutra`;
		} else if (danasAkt.length > 0) {
			title = danasAkt.length === 1 ? '📅 Aktivnost danas' : `📅 ${danasAkt.length} aktivnosti danas`;
			const fazaNaziv = (danasAkt[0].faza as { naziv: string } | null)?.naziv;
			body = fazaNaziv ? `Faza: ${fazaNaziv}` : 'Pogledajte aktivnosti';
		} else {
			title = sutraAkt.length === 1 ? '🔔 Aktivnost sutra' : `🔔 ${sutraAkt.length} aktivnosti sutra`;
			body = 'Pripremite se za sutrašnje aktivnosti';
		}

		const payload = JSON.stringify({
			title,
			body,
			url: '/aktivnosti',
			tag: 'uzgoj-dnevnik',
			hitnost: danasAkt.length > 0 ? 'danas' : 'uskoro'
		});

		// Pošalji push svim uređajima korisnika
		for (const sub of subs) {
			try {
				await webpush.sendNotification(
					{ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
					payload
				);
				result.sent++;
			} catch (err: unknown) {
				const status = (err as { statusCode?: number }).statusCode;
				if (status === 410 || status === 404) {
					// Subscription je istekla — obriši je
					await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
					result.expired_removed++;
				} else {
					console.error('Push send failed:', (err as Error).message);
					result.failed++;
				}
			}
		}
	}

	console.log('Rezultat:', result);
	return new Response(JSON.stringify(result), {
		headers: { 'Content-Type': 'application/json' }
	});
});
