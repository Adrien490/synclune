import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { buildEReportingBatch as BuildEReportingBatch } from "../build-ereporting-batch.service";

/**
 * @regression ereporting-build-bimonthly
 *
 * Audit couverture facturation 2026-05-30 (finding P2-C) : le calcul de période
 * `computeEReportingPeriod` est testé en BIMONTHLY (`ereporting-period.test.ts`),
 * mais l'AGRÉGATION `build-ereporting-batch` ne l'était que sous DAILY. La cadence
 * e-reporting d'une franchise TVA est BIMESTRIELLE (dépôt 25–30 du mois suivant le
 * bimestre) ; ce test verrouille le group-by-période du cron sous BIMONTHLY :
 *  - deux transactions du MÊME bimestre (Jan + Fév) → 1 seule période → 1 batch ;
 *  - deux transactions de bimestres DIFFÉRENTS (Fév + Mar) → 2 périodes → 2 batches ;
 *  - la borne `periodFrom`/`periodTo` upsert est bien le bimestre calendaire.
 *
 * `EREPORTING_PERIOD_LENGTH` est figé à l'import depuis l'env → on stub l'env +
 * `vi.resetModules()` + import dynamique pour charger le service en mode BIMONTHLY.
 */

const { mockPrisma, mockLogger } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingTransaction: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		eReportingBatch: {
			create: vi.fn(),
		},
		eReportingPeriod: {
			upsert: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: {},
	EReportingStatus: {
		PENDING: "PENDING",
		SENT: "SENT",
		ACCEPTED: "ACCEPTED",
		REJECTED: "REJECTED",
		RETRYING: "RETRYING",
		ABANDONED: "ABANDONED",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	TX_TIMEOUT_LONG: 30000,
	TX_MAX_WAIT_LONG: 10000,
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@/modules/cron/constants/limits", () => ({
	EREPORTING_BUILD_CANDIDATE_CAP: 100,
	MAX_BATCH_TRANSACTIONS: 1000,
}));

function makeTransaction(id: string, occurredAt: Date) {
	return {
		id,
		occurredAt,
		amountIncTax: 1000,
		amountExclTax: 1000, // franchise — exclTax == inclTax
		taxAmount: 0,
		vatBreakdown: null,
	};
}

// Chargé dynamiquement APRÈS stub env BIMONTHLY (cf. JSDoc). `import type` est
// erased — n'entraîne aucun chargement du module au niveau statique.
let buildEReportingBatch: typeof BuildEReportingBatch;

beforeEach(async () => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	// Après le 1er mars : les bimestres Jan-Fév et Mar-Avr sont clos (non skippés).
	vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));
	vi.stubEnv("EREPORTING_PERIOD_LENGTH", "BIMONTHLY");
	vi.resetModules();
	({ buildEReportingBatch } = await import("../build-ereporting-batch.service"));

	mockPrisma.$transaction.mockImplementation(
		async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
	);
	mockPrisma.eReportingBatch.create.mockImplementation(
		async (args: { data: { transactionCount: number } }) => ({
			id: `batch-${args.data.transactionCount}`,
			...args.data,
		}),
	);
	mockPrisma.eReportingPeriod.upsert.mockImplementation(
		async (args: { create: { periodFrom: Date } }) => ({
			id: `period-${args.create.periodFrom.toISOString()}`,
		}),
	);
	mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 0 });
});

afterAll(() => {
	vi.unstubAllEnvs();
	vi.useRealTimers();
});

describe("buildEReportingBatch — agrégation BIMONTHLY", () => {
	it("Jan + Fév (même bimestre) → 1 période [Jan1, Mar1) → 1 batch", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("tx-jan", new Date("2026-01-15T10:00:00Z")),
			makeTransaction("tx-feb", new Date("2026-02-20T10:00:00Z")),
		]);

		const result = await buildEReportingBatch();

		expect(mockPrisma.eReportingBatch.create).toHaveBeenCalledTimes(1);
		expect(mockPrisma.eReportingPeriod.upsert).toHaveBeenCalledTimes(1);
		const upsertArgs = mockPrisma.eReportingPeriod.upsert.mock.calls[0]![0] as {
			create: { periodFrom: Date; periodTo: Date };
		};
		expect(upsertArgs.create.periodFrom.toISOString()).toBe("2026-01-01T00:00:00.000Z");
		expect(upsertArgs.create.periodTo.toISOString()).toBe("2026-03-01T00:00:00.000Z");
		// Les 2 transactions sont agrégées dans le même batch.
		const batchArgs = mockPrisma.eReportingBatch.create.mock.calls[0]![0] as {
			data: { transactionCount: number };
		};
		expect(batchArgs.data.transactionCount).toBe(2);
		expect(result.processed).toBe(2);
	});

	it("Fév + Mar (bimestres différents) → 2 périodes → 2 batches", async () => {
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([
			makeTransaction("tx-feb", new Date("2026-02-20T10:00:00Z")),
			makeTransaction("tx-mar", new Date("2026-03-05T10:00:00Z")),
		]);

		await buildEReportingBatch();

		expect(mockPrisma.eReportingBatch.create).toHaveBeenCalledTimes(2);
		const periodStarts = mockPrisma.eReportingPeriod.upsert.mock.calls
			.map((c) => (c[0] as { create: { periodFrom: Date } }).create.periodFrom.toISOString())
			.sort();
		expect(periodStarts).toEqual(["2026-01-01T00:00:00.000Z", "2026-03-01T00:00:00.000Z"]);
	});
});
