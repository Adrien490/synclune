/**
 * @regression ereporting-orphan-continuity
 *
 * EINV-EREPORT-008 — Verrouille le filet anti-trou e-reporting : la détection des
 * transactions PENDING jamais rattachées à un batch alors que leur période est
 * close depuis plus que le délai de grâce (= sous-déclaration DGFiP). L'exclusion
 * constraint `EReportingPeriod_no_overlap` ne porte QUE le non-recouvrement ; ce
 * contrôle porte l'absence de trou. Garanties :
 *  - zéro orpheline → null (jour sans vente : aucun faux positif) ;
 *  - période close + grâce dépassée → détectée ;
 *  - période close récente (grâce non écoulée) → ignorée ;
 *  - `sampleIds` cappé.
 *
 * `now` est INJECTÉ → test déterministe (pas de Date.now() ambiant).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type * as EReportingPeriodModule from "@/modules/invoices/constants/ereporting-period";

const { mockFindMany } = vi.hoisted(() => ({ mockFindMany: vi.fn() }));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { eReportingTransaction: { findMany: mockFindMany } },
}));

// Force DAILY pour un calcul de période déterministe (periodTo = lendemain UTC).
vi.mock("@/modules/invoices/constants/ereporting-period", async (importOriginal) => {
	const actual = await importOriginal<typeof EReportingPeriodModule>();
	return { ...actual, EREPORTING_PERIOD_LENGTH: "DAILY" };
});

import { checkEReportingOrphanTransactions } from "../check-ereporting-period-continuity.service";
import { EREPORTING_ORPHAN_GRACE_MS } from "@/modules/invoices/constants/ereporting-period";

afterEach(() => vi.clearAllMocks());

const NOW = new Date("2026-05-29T12:00:00.000Z");

describe("checkEReportingOrphanTransactions (EINV-EREPORT-008)", () => {
	it("aucune transaction PENDING → null (jour sans vente, pas de faux positif)", async () => {
		mockFindMany.mockResolvedValue([]);
		expect(await checkEReportingOrphanTransactions(NOW)).toBeNull();
	});

	it("PENDING dont la période est close depuis > grâce → détectée", async () => {
		// occurredAt 2026-05-25 → period DAILY close le 2026-05-26T00:00Z,
		// soit > 48h avant NOW (2026-05-29T12:00Z).
		mockFindMany.mockResolvedValue([
			{ id: "tx-old", occurredAt: new Date("2026-05-25T10:00:00.000Z") },
		]);
		const report = await checkEReportingOrphanTransactions(NOW);
		expect(report).not.toBeNull();
		expect(report!.orphanCount).toBe(1);
		expect(report!.oldestOccurredAt).toBe("2026-05-25T10:00:00.000Z");
		expect(report!.oldestPeriodTo).toBe("2026-05-26T00:00:00.000Z");
		expect(report!.sampleIds).toEqual(["tx-old"]);
	});

	it("PENDING dont la période close est dans la fenêtre de grâce → ignorée", async () => {
		// periodTo très proche de NOW : grâce non écoulée → pas orpheline.
		const periodTo = new Date(NOW.getTime() - EREPORTING_ORPHAN_GRACE_MS + 60_000);
		const occurredAt = new Date(periodTo.getTime() - 12 * 60 * 60 * 1000);
		mockFindMany.mockResolvedValue([{ id: "tx-recent", occurredAt }]);
		expect(await checkEReportingOrphanTransactions(NOW)).toBeNull();
	});

	it("retient la plus ancienne et trie l'échantillon par occurredAt croissant", async () => {
		mockFindMany.mockResolvedValue([
			{ id: "tx-1", occurredAt: new Date("2026-05-20T08:00:00.000Z") },
			{ id: "tx-2", occurredAt: new Date("2026-05-22T08:00:00.000Z") },
		]);
		const report = await checkEReportingOrphanTransactions(NOW);
		expect(report!.orphanCount).toBe(2);
		expect(report!.oldestOccurredAt).toBe("2026-05-20T08:00:00.000Z");
		expect(report!.sampleIds[0]).toBe("tx-1");
	});

	it("cappe sampleIds à 50", async () => {
		const rows = Array.from({ length: 120 }, (_, i) => ({
			id: `tx-${i}`,
			occurredAt: new Date("2026-05-20T08:00:00.000Z"),
		}));
		mockFindMany.mockResolvedValue(rows);
		const report = await checkEReportingOrphanTransactions(NOW);
		expect(report!.orphanCount).toBe(120);
		expect(report!.sampleIds).toHaveLength(50);
	});

	it("ne tire que les PENDING non rattachées (filtre where)", async () => {
		mockFindMany.mockResolvedValue([]);
		await checkEReportingOrphanTransactions(NOW);
		expect(mockFindMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ status: "PENDING", batchId: null }),
			}),
		);
	});
});
