import type { TourMeta } from './shared';
import { buildOnboardingTour } from './onboardingTour';
import { buildCiklusTour } from './ciklusTour';
import { buildRodovnikTour } from './rodovnikTour';
import { buildZdravljeTour } from './zdravljeTour';

export const TOURS: TourMeta[] = [
	{
		id: 'onboarding',
		// Bez zahtjeva za stranicom — prvi korak je centriran i radi bilo gdje,
		// naredni koraci sami navigiraju preko ensureRoute().
		naziv: (tt) => tt.tours.onboardingNaziv,
		opis: (tt) => tt.tours.onboardingOpis,
		build: buildOnboardingTour
	},
	{
		id: 'ciklus',
		page: '/parovi',
		pageNavKey: 'parovi',
		naziv: (tt) => tt.tours.ciklus.naziv,
		opis: (tt) => tt.tours.ciklus.opis,
		build: buildCiklusTour
	},
	{
		id: 'rodovnik',
		page: '/ptice',
		pageNavKey: 'ptice',
		naziv: (tt) => tt.tours.rodovnik.naziv,
		opis: (tt) => tt.tours.rodovnik.opis,
		build: buildRodovnikTour
	},
	{
		id: 'zdravlje',
		page: '/ptice',
		pageNavKey: 'ptice',
		naziv: (tt) => tt.tours.zdravlje.naziv,
		opis: (tt) => tt.tours.zdravlje.opis,
		build: buildZdravljeTour
	}
];
