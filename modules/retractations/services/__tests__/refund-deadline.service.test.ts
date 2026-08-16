/**
 * L'échéance légale de remboursement (14 j après la DEMANDE, art. L221-24) est
 * une donnée AFFICHÉE — pas de cron : c'est le badge qui tient l'échéance sous
 * les yeux de Léane. Ces tests verrouillent le contrat du calcul : `null` pour
 * une demande close, arrondi au jour SUPÉRIEUR (mieux vaut annoncer un jour de
 * moins que de masquer un dépassement), et les bornes 0 / 3 que
 * `RefundDeadlineBadge` transforme en alerte.
 */
import { describe, expect, it } from "vitest";
import { RETRACTATION_REFUND_DEADLINE_DAYS } from "../../constants/retractation.constants";
import { getRefundDeadlineDaysLeft } from "../refund-deadline.service";

const MS_PER_DAY = 86_400_000;
const NOW = new Date("2026-08-16T12:00:00Z").getTime();

function requestedDaysAgo(days: number): Date {
	return new Date(NOW - days * MS_PER_DAY);
}

describe("getRefundDeadlineDaysLeft", () => {
	it.each(["REFUNDED", "REJECTED"] as const)("null pour une demande close (%s)", (status) => {
		expect(getRefundDeadlineDaysLeft(status, requestedDaysAgo(2), NOW)).toBeNull();
	});

	it.each(["RECEIVED", "ACKNOWLEDGED", "AWAITING_RETURN"] as const)(
		"calcule l'échéance pour une demande active (%s)",
		(status) => {
			expect(getRefundDeadlineDaysLeft(status, requestedDaysAgo(2), NOW)).toBe(
				RETRACTATION_REFUND_DEADLINE_DAYS - 2,
			);
		},
	);

	it("demande à l'instant : le plein délai", () => {
		expect(getRefundDeadlineDaysLeft("RECEIVED", requestedDaysAgo(0), NOW)).toBe(
			RETRACTATION_REFUND_DEADLINE_DAYS,
		);
	});

	it("arrondit au jour SUPÉRIEUR (13 j ½ écoulés → « 1 j », pas « 0 »)", () => {
		const requestedAt = new Date(NOW - 13.5 * MS_PER_DAY);
		expect(getRefundDeadlineDaysLeft("AWAITING_RETURN", requestedAt, NOW)).toBe(1);
	});

	it("échéance exacte : 0 (le badge passe « dépassé »)", () => {
		expect(
			getRefundDeadlineDaysLeft(
				"AWAITING_RETURN",
				requestedDaysAgo(RETRACTATION_REFUND_DEADLINE_DAYS),
				NOW,
			),
		).toBe(0);
	});

	it("au-delà de l'échéance : négatif (toujours ≤ 0, jamais null pour une demande active)", () => {
		expect(
			getRefundDeadlineDaysLeft(
				"ACKNOWLEDGED",
				requestedDaysAgo(RETRACTATION_REFUND_DEADLINE_DAYS + 6),
				NOW,
			),
		).toBe(-6);
	});
});
