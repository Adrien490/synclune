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
 *  - REJECTED (sync) + REJECTED (4xx) + ABANDONED → re-queue (batchId:null, PENDING).
 *  - SENT / ACCEPTED → JAMAIS re-queue (transactions rattachées, status propagé).
 *  - RETRYING → JAMAIS re-queue (retry niveau batch, enfants rattachés).
 *  - Batch sans transaction vivante → SKIPPED_EMPTY, provider non appelé (pas de
 *    transmission d'un batch fantôme à la DGFiP).
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
				}) => void,
			) =>
				cb({
					setTag: vi.fn(),
					setFingerprint: vi.fn(),
					setLevel: vi.fn(),
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

/** Capture l'unique appel updateMany sur les transactions (ou undefined). */
function lastTransactionUpdateMany():
	| { where: unknown; data: Record<string, unknown> }
	| undefined {
	const calls = mockPrisma.eReportingTransaction.updateMany.mock.calls;
	return calls.at(-1)?.[0] as { where: unknown; data: Record<string, unknown> } | undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-05-28T12:00:00Z"));
	mockFeatureFlags.enable_ereporting = true;
	mockPrisma.eReportingTransaction.findMany.mockResolvedValue(LIVE_TRANSACTIONS);
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
		// Re-queue, PAS propagation status=REJECTED.
		expect(lastTransactionUpdateMany()).toEqual({
			where: { batchId: "batch-1" },
			data: { batchId: null, status: "PENDING" },
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
			where: { batchId: "batch-1" },
			data: { batchId: null, status: "PENDING" },
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
			where: { batchId: "batch-1" },
			data: { batchId: null, status: "PENDING" },
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
