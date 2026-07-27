/**
 * @regression cron-hobby-plan-daily-limit
 *
 * Le plan Vercel **Hobby** n'autorise qu'**une exécution par jour et par cron**.
 * Un crontab plus fréquent ne dégrade rien en silence : l'API Vercel REFUSE le
 * déploiement entier, avant le build —
 * `Error: Hobby accounts are limited to daily cron jobs. This cron expression
 * (*​/30 * * * *) would run more than once per day.`
 *
 * Constaté le 2026-07-27 : la production était bloquée dessus (dernier
 * déploiement réussi 38 jours plus tôt), et le symptôme n'apparaît qu'au
 * `vercel deploy` — ni le build local, ni le typecheck, ni les autres tests ne
 * le voient. D'où ce verrou statique.
 *
 * Il porte sur `vercel.json` (autorité d'exécution réelle) ET sur
 * `CRON_SCHEDULES` (SSOT du monitoring Sentry) : c'est le premier que Vercel
 * lit, mais laisser dériver le second casserait la détection de run manqué.
 *
 * ⚠️ Ne pas relâcher ce test pour « juste un cron plus fréquent » : il n'y a
 * pas de demi-mesure côté Vercel, une seule expression infra-journalière suffit
 * à rendre TOUT déploiement impossible. Le seul moyen de repasser à une cadence
 * infra-journalière est un plan Pro — et alors ce test doit être supprimé, pas
 * contourné.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CRON_SCHEDULES } from "../schedules";

/**
 * `true` si le crontab peut se déclencher plus d'une fois par jour.
 *
 * Un déclenchement au plus quotidien exige un champ minute ET un champ heure
 * réduits à une valeur littérale unique : tout `*`, `*​/n` ou liste `a,b` sur
 * l'un des deux multiplie les exécutions dans la journée. Les champs jour /
 * mois / jour-de-semaine, eux, ne peuvent que réduire la fréquence.
 */
function runsMoreThanOncePerDay(crontab: string): boolean {
	const [minute, hour] = crontab.trim().split(/\s+/);
	const isSingleLiteral = (field: string | undefined) => /^\d+$/.test(field ?? "");
	return !isSingleLiteral(minute) || !isSingleLiteral(hour);
}

const vercelCrons = (
	JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf-8")) as {
		crons: Array<{ path: string; schedule: string }>;
	}
).crons;

describe("plafond Hobby — un run par jour et par cron", () => {
	it("détecte bien les expressions infra-journalières (garde-fou du garde-fou)", () => {
		// Les 5 expressions exactes qui ont fait refuser le déploiement du 2026-07-27.
		for (const bad of ["*/30 * * * *", "0 * * * *", "0 */4 * * *", "30 */6 * * *", "*/5 * * * *"]) {
			expect(runsMoreThanOncePerDay(bad), `${bad} devrait être rejeté`).toBe(true);
		}
		// Et n'émet pas de faux positif sur les cadences légitimes.
		for (const ok of ["0 2 * * *", "30 8 * * *", "0 4 2 * *", "0 4 * * 3"]) {
			expect(runsMoreThanOncePerDay(ok), `${ok} devrait être accepté`).toBe(false);
		}
	});

	it("vercel.json déclare au moins un cron (garde-fou du garde-fou)", () => {
		expect(vercelCrons.length).toBeGreaterThan(0);
	});

	it.each(vercelCrons)("vercel.json : $path tourne au plus une fois par jour", ({ schedule }) => {
		expect(runsMoreThanOncePerDay(schedule)).toBe(false);
	});

	it.each(Object.entries(CRON_SCHEDULES))(
		"CRON_SCHEDULES : %s tourne au plus une fois par jour",
		(_job, crontab) => {
			expect(runsMoreThanOncePerDay(crontab)).toBe(false);
		},
	);
});
