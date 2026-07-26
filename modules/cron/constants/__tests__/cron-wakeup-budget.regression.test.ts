/**
 * @regression cron-wakeup-budget
 *
 * Audit coûts P1-2 — chaque exécution de cron réveille la base Neon, dont le
 * scale-to-zero se déclenche après **5 minutes** d'inactivité. La facturation
 * Neon se fait en compute-hours (temps ACTIF × CU), pas en requêtes : un cron
 * plus fréquent que l'autosuspend maintient donc la base allumée 24/7.
 *
 * Le plan Free alloue ~191,9 compute-hours/mois, soit très exactement un compute
 * 0,25 CU allumé en permanence (730 h × 0,25 = 182,5). Un cron en `*​/5` consommait
 * à lui seul 95 % de l'allocation avant le premier visiteur — et au dépassement
 * Neon **suspend le compute jusqu'au mois suivant**, ce qui met la boutique hors
 * service, checkout compris.
 *
 * Ce test verrouille deux propriétés :
 * 1. aucune cadence sous le seuil d'autosuspend + marge (30 min) ;
 * 2. le nombre de réveils DISTINCTS par heure reste borné — deux crons décalés
 *    coûtent deux réveils là où deux crons alignés n'en coûtent qu'un.
 */
import { describe, it, expect } from "vitest";
import { CRON_SCHEDULES } from "../schedules";

/** Autosuspend Neon (5 min) + marge : en deçà, la base ne se rendort jamais. */
const MIN_INTERVAL_MINUTES = 30;

/**
 * Plafond de réveils distincts par heure, toutes tâches confondues.
 *
 * 2 = les crons demi-horaires alignés sur :00 et :30. Relever cette valeur, c'est
 * accepter une hausse proportionnelle de la consommation Neon : le justifier.
 */
const MAX_DISTINCT_WAKEUPS_PER_HOUR = 2;

/**
 * Minutes de l'heure où un crontab se déclenche, ou `null` si le job tourne au
 * plus une fois par jour (impact négligeable sur le cycle de service).
 */
function triggerMinutesWithinHour(crontab: string): number[] | null {
	const [minuteField, hourField] = crontab.split(" ");

	// Job quotidien/mensuel : une poignée de réveils par mois, hors budget.
	if (hourField !== "*" && !hourField?.startsWith("*/")) return null;

	if (minuteField === "*") {
		return Array.from({ length: 60 }, (_, i) => i);
	}

	const stepMatch = /^\*\/(\d+)$/.exec(minuteField ?? "");
	if (stepMatch) {
		const step = Number(stepMatch[1]);
		return Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
	}

	return (minuteField ?? "0").split(",").map(Number);
}

const subHourlyJobs = Object.entries(CRON_SCHEDULES)
	.map(([job, crontab]) => ({ job, crontab, minutes: triggerMinutesWithinHour(crontab) }))
	.filter((entry): entry is { job: string; crontab: string; minutes: number[] } =>
		Boolean(entry.minutes),
	);

describe("budget de réveils des crons", () => {
	it("n'a aucun job plus fréquent que l'autosuspend Neon", () => {
		for (const { job, crontab, minutes } of subHourlyJobs) {
			if (minutes.length < 2) continue;

			const interval = minutes[1]! - minutes[0]!;
			expect(
				interval,
				`${job} (${crontab}) tourne toutes les ${interval} min : sous ${MIN_INTERVAL_MINUTES} min la base Neon ne se rendort jamais.`,
			).toBeGreaterThanOrEqual(MIN_INTERVAL_MINUTES);
		}
	});

	it("aligne les crons demi-horaires pour mutualiser les réveils", () => {
		const distinctWakeups = new Set(subHourlyJobs.flatMap((entry) => entry.minutes));

		expect(
			distinctWakeups.size,
			`Réveils distincts/heure : ${[...distinctWakeups].sort((a, b) => a - b).join(", ")}. ` +
				`Aligner les crons sur les mêmes minutes plutôt que de les décaler.`,
		).toBeLessThanOrEqual(MAX_DISTINCT_WAKEUPS_PER_HOUR);
	});
});
