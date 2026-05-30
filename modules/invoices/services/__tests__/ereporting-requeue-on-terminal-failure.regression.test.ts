import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression ereporting-requeue-rejected-abandoned
 *
 * Verrouille le re-queue des transactions e-reporting d'un batch qui échoue
 * terminalement. Quand `submitEReportingBatchById` fait passer un
 * `EReportingBatch` en `REJECTED` (ACK synchrone PA ou erreur métier 4xx) ou
 * `ABANDONED` (retries réseau épuisés), ses `EReportingTransaction` DOIVENT être
 * détachées (`batchId = null`) et repassées `PENDING` — atomiquement avec
 * l'update du batch — pour que le prochain run de `build-ereporting-batch` les
 * ré-agrège dans un NOUVEAU batch. Sans ça elles restent orphelines (rattachées
 * à un batch mort que `build` ne reprend jamais : il filtre `batchId IS NULL`).
 *
 * Garde-fous verrouillés ici :
 *  - REJECTED (sync) + REJECTED (4xx) + ABANDONED → re-queue (batchId:null, PENDING)
 *    + incrément `requeueCount` (cap anti-boucle EINV-EREPORT-009).
 *  - SENT / ACCEPTED → JAMAIS re-queue (transactions rattachées, status propagé).
 *  - RETRYING → JAMAIS re-queue (retry niveau batch, enfants rattachés).
 *  - Batch sans transaction vivante → SKIPPED_EMPTY, provider non appelé (pas de
 *    transmission d'un batch fantôme à la DGFiP).
 *  - Cap atteint (`requeueCount >= MAX_REQUEUE_ATTEMPTS`) → figées ABANDONED,
 *    RESTENT attachées (jamais détachées), alerte Sentry `requeue-cap-exceeded`.
 *
 * Cf. CLAUDE.md § "Facturation électronique — invariants" #9 + objectif re-queue.
 */

const { mockPrisma, mockLogger, mockProvider, mockSentry, mockFeatureFlags } = vi.hoisted(() => ({
	mockPrisma: {
		eReportingBatch: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
		eReportingTransaction: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	mockProvider: {
		id: "mock-pa",
		submitEReportingBatch: vi.fn(),
	},
	mockSentry: {
		withScope: vi.fn(
			(
				cb: (s: {
					setTag: typeof vi.fn;
					setFingerprint: typeof vi.fn;
					setLevel: typeof vi.fn;
					setContext: typeof vi.fn;
				}) => void,
			) =>
				cb({
					setTag: vi.fn(),
					setFingerprint: vi.fn(),
					setLevel: vi.fn(),
					setContext: vi.fn(),
				}),
		),
		captureException: vi.fn(),
		captureMessage: vi.fn(),
		addBreadcrumb: vi.fn(),
		startSpan: vi.fn((_: unknown, fn: (s: unknown) => unknown) => fn({ setAttribute: vi.fn() })),
	},
	mockFeatureFlags: { enable_xml: false, enable_ereporting: true },
}));

vi.mock("@sentry/nextjs", () => mockSentry);

vi.mock("@/app/generated/prisma/client", () => ({
	EReportingStatus: {
		PENDING: "PENDING",
		SENT: "SENT",
		ACCEPTED: "ACCEPTED",
		REJECTED: "REJECTED",
		RETRYING: "RETRYING",
		ABANDONED: "ABANDONED",
	},
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@/modules/invoices/providers/factory", () => ({
	getInvoiceProvider: () => mockProvider,
}));
vi.mock("@/modules/invoices/constants/feature-flags", () => ({
	INVOICE_FEATURE_FLAGS: mockFeatureFlags,
}));

import {
	submitEReportingBatchById,
	ProviderBusinessError,
	MAX_RETRY,
	MAX_REQUEUE_ATTEMPTS,
} from "../submit-ereporting-batch.service";

function makeBatch(overrides: Record<string, unknown> = {}) {
	return {
		id: "batch-1",
		status: "PENDING",
		retryCount: 0,
		updatedAt: new Date("2026-05-28T00:00:00Z"),
		periodFrom: new Date("2026-05-27T00:00:00Z"),
		periodTo: new Date("2026-05-28T00:00:00Z"),
		transactionCount: 2,
		totalAmountIncTax: 2000,
		totalAmountExclTax: 2000,
		totalTaxAmount: 0,
		...overrides,
	};
}

const LIVE_TRANSACTIONS = [
	{
		occurredAt: new Date("2026-05-27T10:00:00Z"),
		countryCode: "FR",
		amountIncTax: 1000,
		amountExclTax: 1000,
		taxAmount: 0,
		paymentMethod: "CARD",
		currency: "EUR",
		type: "SALES",
	},
	{
		occurredAt: new Date("2026-05-27T11:00:00Z"),
		countryCode: "FR",
		amountIncTax: 1000,
		amountExclTax: 1000,
		taxAmount: 0,
		paymentMethod: "CARD",
		currency: "EUR",
		type: "SALES",
	},
];

/**
 * Capture le DERNIER appel updateMany sur les transactions. Sur le chemin
 * re-queue, c'est l'appel « requeued » (détache + PENDING, filtre `lt cap`) car
 * `requeueBatchTransactions` traite le cap (`gte cap`) en premier.
 */
function lastTransactionUpdateMany():
	| { where: unknown; data: Record<string, unknown> }
	| undefined {
	const calls = mockPrisma.eReportingTransaction.updateMany.mock.calls;
	return calls.at(-1)?.[0] as { where: unknown; data: Record<string, unknown> } | undefined;
}

/** Premier appel updateMany = branche « capped » (fige ABANDONED, filtre `gte cap`). */
function cappedTransactionUpdateMany():
	| { where: Record<string, unknown>; data: Record<string, unknown> }
	| undefined {
	const calls = mockPrisma.eReportingTransaction.updateMany.mock.calls;
	return calls[0]?.[0] as
		| { where: Record<string, unknown>; data: Record<string, unknown> }
		| undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));
	mockFeatureFlags.enable_ereporting = true;
	mockPrisma.eReportingTransaction.findMany.mockResolvedValue(LIVE_TRANSACTIONS);
	// requeueBatchTransactions lit `.count` du retour updateMany. Défaut : aucune
	// transaction cappée (count 0) → pas d'alerte parasite sur les cas nominaux.
	mockPrisma.eReportingTransaction.updateMany.mockResolvedValue({ count: 0 });
	mockPrisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
		cb(mockPrisma),
	);
});

describe("re-queue — REJECTED / ABANDONED détache et repasse PENDING", () => {
	it("REJECTED synchrone (ACK PA) → transactions détachées + PENDING", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
			rejectionReason: "INVALID_BATCH_FORMAT",
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("REJECTED");
		// Re-queue (détache + PENDING) + incrément requeueCount, filtre sous le cap.
		expect(lastTransactionUpdateMany()).toEqual({
			where: { batchId: "batch-1", requeueCount: { lt: MAX_REQUEUE_ATTEMPTS } },
			data: { batchId: null, status: "PENDING", requeueCount: { increment: 1 } },
		});
		// Le batch reste un tombstone REJECTED.
		const batchUpdate = mockPrisma.eReportingBatch.update.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		expect(batchUpdate.data.status).toBe("REJECTED");
	});

	it("REJECTED métier 4xx (ProviderBusinessError) → transactions détachées + PENDING", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockRejectedValue(
			new ProviderBusinessError("Invalid payload schema", 422),
		);

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("REJECTED");
		expect(lastTransactionUpdateMany()).toEqual({
			where: { batchId: "batch-1", requeueCount: { lt: MAX_REQUEUE_ATTEMPTS } },
			data: { batchId: null, status: "PENDING", requeueCount: { increment: 1 } },
		});
	});

	it("ABANDONED (retries épuisés) → transactions détachées + PENDING", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(
			makeBatch({ status: "RETRYING", retryCount: MAX_RETRY, updatedAt: new Date(0) }),
		);
		mockProvider.submitEReportingBatch.mockRejectedValue(new Error("ETIMEDOUT"));

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("ABANDONED");
		expect(lastTransactionUpdateMany()).toEqual({
			where: { batchId: "batch-1", requeueCount: { lt: MAX_REQUEUE_ATTEMPTS } },
			data: { batchId: null, status: "PENDING", requeueCount: { increment: 1 } },
		});
	});
});

describe("re-queue — états non terminaux/succès ne re-queuent JAMAIS", () => {
	it("ACCEPTED → propagation status (rattaché), jamais batchId:null", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-ok",
			status: "ACCEPTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("ACCEPTED");
		const update = lastTransactionUpdateMany();
		expect(update?.data).toEqual({ status: "ACCEPTED" });
		// Aucun appel ne doit détacher (batchId:null).
		for (const call of mockPrisma.eReportingTransaction.updateMany.mock.calls) {
			expect((call[0] as { data: Record<string, unknown> }).data.batchId).not.toBe(null);
		}
	});

	it("SENT → propagation status (rattaché), jamais batchId:null", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-sent",
			status: "SENT",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
		});

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("SENT");
		expect(lastTransactionUpdateMany()?.data).toEqual({ status: "SENT" });
	});

	it("RETRYING (erreur réseau, retries restants) → aucune mutation des transactions", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockRejectedValue(new Error("ECONNRESET"));

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("RETRYING");
		expect(mockPrisma.eReportingTransaction.updateMany).not.toHaveBeenCalled();
	});
});

describe("cap anti-boucle (EINV-EREPORT-009)", () => {
	it("capped updateMany fige ABANDONED (rattaché) sans détacher, filtre >= cap", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
			rejectionReason: "INVALID_BATCH_FORMAT",
		});

		await submitEReportingBatchById("batch-1");

		// 1er updateMany = branche capped : status ABANDONED, PAS de batchId:null
		// (reste attaché au tombstone → visible alert-stuck-orders), incrément.
		expect(cappedTransactionUpdateMany()).toEqual({
			where: { batchId: "batch-1", requeueCount: { gte: MAX_REQUEUE_ATTEMPTS } },
			data: { status: "ABANDONED", requeueCount: { increment: 1 } },
		});
		expect(cappedTransactionUpdateMany()?.data.batchId).toBeUndefined();
	});

	it("capped > 0 → alerte Sentry `requeue-cap-exceeded` + logger.error", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
			rejectionReason: "INVALID_BATCH_FORMAT",
		});
		// Le 1er updateMany (capped) rapporte 1 transaction figée.
		mockPrisma.eReportingTransaction.updateMany.mockResolvedValueOnce({ count: 1 });

		await submitEReportingBatchById("batch-1");

		const capError = mockSentry.captureException.mock.calls
			.map((c) => c[0] as Error)
			.find((e) => /requeue cap/i.test(e.message));
		expect(capError).toBeDefined();
		expect(
			mockLogger.error.mock.calls.some((c) => /requeue cap exceeded/i.test(String(c[0]))),
		).toBe(true);
	});

	it("capped = 0 (cas nominal) → aucune alerte de cap", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockProvider.submitEReportingBatch.mockResolvedValue({
			providerBatchId: "pa-reject",
			status: "REJECTED",
			submittedAt: new Date("2026-05-28T12:00:00Z"),
			rejectionReason: "INVALID_BATCH_FORMAT",
		});
		// updateMany défaut {count:0} → aucune transaction cappée.

		await submitEReportingBatchById("batch-1");

		expect(
			mockSentry.captureException.mock.calls
				.map((c) => c[0] as Error)
				.some((e) => /requeue cap/i.test(e.message)),
		).toBe(false);
	});
});

describe("re-queue — garde batch vide", () => {
	it("batch éligible sans transaction vivante → SKIPPED_EMPTY, provider non appelé", async () => {
		mockPrisma.eReportingBatch.findUnique.mockResolvedValue(makeBatch());
		mockPrisma.eReportingTransaction.findMany.mockResolvedValue([]);

		const result = await submitEReportingBatchById("batch-1");

		expect(result.status).toBe("SKIPPED_EMPTY");
		expect(mockProvider.submitEReportingBatch).not.toHaveBeenCalled();
		expect(mockPrisma.eReportingBatch.update).not.toHaveBeenCalled();
	});
});
