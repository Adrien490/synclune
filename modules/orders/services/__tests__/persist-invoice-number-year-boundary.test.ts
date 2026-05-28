/**
 * Régression année-frontière : after F-2026-99999 (overflow), le passage à
 * 2027 NE DOIT PAS continuer la séquence — F-2027-00001 démarre vierge.
 * Art. 286 CGI : séquentialité par ANNÉE indépendante, pas globale.
 *
 * EINV-TEST-019 — combine overflow + transition année (les 2 cas existants
 * sont testés séparément dans `persist-invoice-number.service.test.ts`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

const { mockTx, mockPrisma, mockUpdateTag, mockLogger } = vi.hoisted(() => {
	const mockTx = {
		$executeRaw: vi.fn(),
		$queryRaw: vi.fn(),
		order: {
			update: vi.fn(),
			findUnique: vi.fn(),
		},
		orderHistory: {
			create: vi.fn(),
		},
	};
	return {
		mockTx,
		mockPrisma: { $transaction: vi.fn() },
		mockUpdateTag: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: vi.fn(() => ["orders-list"]),
}));

import { persistInvoiceNumber } from "../persist-invoice-number.service";

function runTx() {
	mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
		cb(mockTx),
	);
}

function makeOrderForSnapshot(): Record<string, unknown> {
	return {
		id: "order-1",
		orderNumber: "SYN-2026-99999",
		userId: "user-1",
		customerEmail: "test@example.com",
		customerName: "Alice",
		customerPhone: null,
		customerType: "B2C",
		customerCompanyName: null,
		customerCompanySiren: null,
		customerCompanySiret: null,
		customerCompanyVatNumber: null,
		shippingFirstName: "Alice",
		shippingLastName: "Dupont",
		shippingAddress1: "1 rue",
		shippingAddress2: null,
		shippingPostalCode: "75001",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		billingSameAsShipping: true,
		billingFirstName: null,
		billingLastName: null,
		billingAddress1: null,
		billingAddress2: null,
		billingPostalCode: null,
		billingCity: null,
		billingCountry: null,
		billingPhone: null,
		subtotal: 4500,
		discountAmount: 0,
		taxAmount: 0,
		shippingCost: 0,
		total: 4500,
		currency: "EUR",
		paymentMethod: "CARD",
		paidAt: new Date("2026-12-31T22:00:00Z"),
		stripePaymentIntentId: "pi_x",
		items: [
			{
				id: "item-1",
				productTitle: "Collier",
				productDescription: null,
				productImageUrl: null,
				skuSku: "SKU-1",
				skuColor: null,
				skuColorHexes: null,
				skuMaterial: "Argent",
				skuSize: null,
				skuImageUrl: null,
				price: 4500,
				quantity: 1,
				taxRate: 0,
				taxAmount: 0,
				lineTotalExcludingTax: 4500,
				lineTotalIncludingTax: 4500,
				taxCategoryCode: "ZB",
			},
		],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.$executeRaw.mockResolvedValue(undefined);
	mockTx.order.findUnique.mockResolvedValue(makeOrderForSnapshot());
});

afterEach(() => {
	vi.useRealTimers();
});

describe("persistInvoiceNumber — year boundary (EINV-TEST-019)", () => {
	it("overflow F-2026-99999 retourne null + log error (limite atteinte)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-12-31T22:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-99999" }]);

		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result).toBeNull();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("après overflow 2026, l'année 2027 démarre à F-2027-00001 (séquence indépendante, pas de continuité)", async () => {
		// 2027-01-01 : la SELECT filtre par prefix "F-2027-%" → renvoie [] (aucune facture 2027 encore)
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2027-01-01T00:01:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]); // SELECT prefix=F-2027-% returns nothing
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result?.invoiceNumber).toBe("F-2027-00001");
		const queryArg = mockTx.$queryRaw.mock.calls[0]![0];
		expect(queryArg.values[0]).toBe("F-2027-%");
	});

	it("le SELECT 2027 ne voit PAS les factures 2026 (filtre LIKE par préfixe d'année)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2027-01-01T00:01:00Z"));
		runTx();
		// Si quelqu'un avait par erreur passé un filtre globalement (sans année),
		// le SELECT verrait "F-2026-99999" en tête → next serait 100000 → overflow.
		// Le test garantit que la valeur LIKE est bien "F-2027-%" pas "F-%".
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		await persistInvoiceNumber("order-1", "user-1");

		const queryArg = mockTx.$queryRaw.mock.calls[0]![0];
		expect(queryArg.values[0]).toMatch(/^F-2027-%$/);
		expect(queryArg.values[0]).not.toMatch(/^F-2026/);
	});

	it("l'advisory lock key change entre 2026 et 2027 (lock par année, pas global)", async () => {
		vi.useFakeTimers();

		// Année 2026
		vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockResolvedValue({
			invoiceNumber: "F-2026-00001",
			invoiceGeneratedAt: new Date(),
		});
		await persistInvoiceNumber("order-1", "user-1");
		const lockKey2026 = mockTx.$executeRaw.mock.calls[0]![0].values[0];

		// Année 2027
		vi.clearAllMocks();
		mockTx.$executeRaw.mockResolvedValue(undefined);
		mockTx.order.findUnique.mockResolvedValue(makeOrderForSnapshot());
		vi.setSystemTime(new Date("2027-06-15T12:00:00Z"));
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockResolvedValue({
			invoiceNumber: "F-2027-00001",
			invoiceGeneratedAt: new Date(),
		});
		runTx();
		await persistInvoiceNumber("order-1", "user-1");
		const lockKey2027 = mockTx.$executeRaw.mock.calls[0]![0].values[0];

		expect(lockKey2026).toBe(1_000_000 + 2026);
		expect(lockKey2027).toBe(1_000_000 + 2027);
		expect(lockKey2026).not.toBe(lockKey2027);
	});

	it("ne retry PAS l'overflow (BusinessError ≠ P2002) — défaut MAX_RETRIES non déclenché", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-12-31T23:59:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-99999" }]);

		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result).toBeNull();
		// 1 seul appel à $transaction (pas de retry)
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		// P2002 testé séparément dans le service test parent
		const error = mockLogger.error.mock.calls[0]?.[1];
		expect((error as { message?: string }).message).toContain("saturée");
	});

	it("F-2026-99998 → F-2026-99999 (dernier numéro autorisé de l'année, pas d'overflow)", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-12-31T20:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-99998" }]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("order-1", "user-1");

		expect(result?.invoiceNumber).toBe("F-2026-99999");
	});
});
