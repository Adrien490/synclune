/**
 * Longueur de période d'agrégation e-reporting B2C (EINV-EREPORT-006).
 *
 * ⚠️ VALEUR RÉGLEMENTAIRE À CONFIRMER contre l'arrêté final / la spec de la
 * Plateforme Agréée (PA). La cadence de transmission e-reporting en franchise
 * TVA (art. 293 B) est de nature **bimestrielle** (dépôt au plus tard entre le
 * 25 et le 30 du mois suivant le bimestre). MAIS l'arrêté d'application n'est
 * pas publié (mai 2026) et la PA peut elle-même agréger — on NE FIGE RIEN :
 * la longueur est configurable via `EREPORTING_PERIOD_LENGTH`, **défaut `DAILY`**
 * (comportement prudent + historique du cron `build-ereporting-batch`).
 *
 * `MONTHLY` / `BIMONTHLY` sont implémentés et branchés de bout en bout
 * (`computeEReportingPeriod` + grouping period-aware dans `build-ereporting-batch`) :
 * passer à la cadence réglementaire le jour où la spec PA est fixée n'est plus
 * qu'un changement de variable d'environnement, sans toucher au code.
 *
 * La contrainte d'exclusion `EReportingPeriod_no_overlap` (Postgres) garantit le
 * NON-RECOUVREMENT QUELLE QUE SOIT la longueur choisie ici — elle ne dépend que
 * des bornes [periodFrom, periodTo), pas de leur durée. L'absence de TROU, elle,
 * n'est PAS portée par le schéma : elle repose sur (a) le build qui crée toujours
 * la période contiguë de toute période ayant des transactions et (b) le contrôle
 * de continuité par orphelins (`check-ereporting-period-continuity.service.ts`).
 */
export type EReportingPeriodLength = "DAILY" | "MONTHLY" | "BIMONTHLY";

function parsePeriodLength(value: string | undefined): EReportingPeriodLength {
	switch (value?.toUpperCase()) {
		case "MONTHLY":
			return "MONTHLY";
		case "BIMONTHLY":
			return "BIMONTHLY";
		case "DAILY":
		default:
			return "DAILY";
	}
}

export const EREPORTING_PERIOD_LENGTH: EReportingPeriodLength = parsePeriodLength(
	process.env.EREPORTING_PERIOD_LENGTH,
);

function parseBoolEnv(value: string | undefined): boolean {
	if (!value) return false;
	const v = value.toLowerCase();
	return v === "true" || v === "1" || v === "yes";
}

/**
 * EINV-EREPORT-010 — Acquittement EXPLICITE pour transmettre en cadence `DAILY`
 * vers une Plateforme Agréée (PA) qui transmet réellement (hors dry-run `local`
 * et hors `mock`). Par défaut `false` : `submit-ereporting-batch` refuse
 * (fail-closed) la transmission journalière, car une PA en franchise art. 293 B
 * attend un **dépôt bimestriel** (cf. `EREPORTING_PERIOD_LENGTH` + référentiel).
 *
 * Le piège visé : brancher une vraie PA (`INVOICE_PROVIDER` réel +
 * `INVOICE_ENABLE_EREPORTING=true`) en oubliant de passer la cadence en
 * `BIMONTHLY` ⇒ ~60 batches journaliers envoyés à une PA qui en attend un seul.
 *
 * Mettre à `true` UNIQUEMENT si la spec de la PA confirme accepter le détail
 * journalier en transmission. Sans effet en dry-run (`local`).
 */
export const EREPORTING_ALLOW_DAILY_TRANSMISSION: boolean = parseBoolEnv(
	process.env.EREPORTING_ALLOW_DAILY_TRANSMISSION,
);

/**
 * Délai de grâce après la clôture d'une période avant qu'une transaction PENDING
 * non rattachée à un batch ne soit considérée comme orpheline (sous-déclaration
 * potentielle). 48h couvre un run quotidien manqué de `build-ereporting-batch`
 * sans alerter à tort sur la latence normale d'agrégation. Cf.
 * `check-ereporting-period-continuity.service.ts`.
 */
export const EREPORTING_ORPHAN_GRACE_MS = 48 * 60 * 60 * 1000;

/**
 * Borne inférieure (inclusive) du jour UTC contenant `date`.
 */
function startOfUtcDay(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

/**
 * Calcule l'intervalle [periodFrom, periodTo) de la période e-reporting contenant
 * `date`, aligné sur `EREPORTING_PERIOD_LENGTH`. Les bornes produites sont
 * contiguës d'une période à l'autre (periodTo de l'une = periodFrom de la
 * suivante) → ni trou ni recouvrement, compatible avec l'exclusion constraint.
 *
 * Pur (pas d'I/O). UTC pour éviter toute dérive DST.
 *  - `DAILY`     : [00:00 du jour, 00:00 du lendemain).
 *  - `MONTHLY`   : [1er du mois, 1er du mois suivant).
 *  - `BIMONTHLY` : bimestre calendaire ancré sur mois pair-0-indexé
 *                  (Jan-Fév, Mar-Avr, …) → [1er du bimestre, 1er du bimestre suivant).
 */
export function computeEReportingPeriod(date: Date): { periodFrom: Date; periodTo: Date } {
	switch (EREPORTING_PERIOD_LENGTH) {
		case "MONTHLY": {
			const y = date.getUTCFullYear();
			const m = date.getUTCMonth();
			const periodFrom = new Date(Date.UTC(y, m, 1));
			const periodTo = new Date(Date.UTC(y, m + 1, 1));
			return { periodFrom, periodTo };
		}
		case "BIMONTHLY": {
			const y = date.getUTCFullYear();
			const m = date.getUTCMonth();
			const bimesterStart = m - (m % 2); // 0,2,4,6,8,10
			const periodFrom = new Date(Date.UTC(y, bimesterStart, 1));
			const periodTo = new Date(Date.UTC(y, bimesterStart + 2, 1));
			return { periodFrom, periodTo };
		}
		case "DAILY":
		default: {
			const periodFrom = startOfUtcDay(date);
			const periodTo = new Date(periodFrom.getTime() + 24 * 60 * 60 * 1000);
			return { periodFrom, periodTo };
		}
	}
}
