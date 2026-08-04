/**
 * Régression année-frontière : after F-2026-99999 (overflow), le passage à
 * 2027 NE DOIT PAS continuer la séquence — F-2027-00001 démarre vierge.
 * Art. 286 CGI : séquentialité par ANNÉE indépendante, pas globale.
 *
 * EINV-TEST-019 — combine overflow + transition année (les 2 cas existants
 * sont testés séparément dans `persist-invoice-number.service.test.ts`).
 *
 * EINV-SEQ-002 (audit séquences 2026-05-28) : le millésime de la séquence suit
 * désormais la date d'ENCAISSEMENT (`order.paidAt`) en `Europe/Paris`, PAS
 * l'horloge de génération. Ces tests pilotent donc l'année via `paidAt`
 * (mocké sur `prisma.order.findUnique`), pas via `vi.setSystemTime`.
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
		mockPrisma: { $transaction: vi.fn(), order: { findUnique: vi.fn() } },
		mockUpdateTag: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	};
});

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
// Ce service s'execute en contexte route handler (cron/webhook) : il invalide via
// `revalidateTagsInBackground` -> `revalidateTag(tag, { expire: 0 })`, car
// `updateTag` y throw (E872). Les DEUX sont routes vers le meme espion : ce que
// ces tests verifient, c'est QUELS tags sont invalides. Le choix de l'API selon le
// contexte est prouve, lui, sans mock, par
// `test/contract/cache-invalidation-context.contract.test.ts`.
vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	revalidateTag: (tag: string) => mockUpdateTag(tag),
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

/**
 * EINV-SEQ-002 + EINV-SEQ-005 : pilote le millésime via la date d'encaissement.
 * `prisma.order.findUnique` (hors transaction) lit l'order complet (snapshot +
 * paidAt/createdAt) — il n'y a plus de findUnique dans la transaction.
 */
function setPaidAt(paidAt: Date): void {
	mockPrisma.order.findUnique.mockResolvedValue({
		...makeOrderForSnapshot(),
		paidAt,
		createdAt: paidAt,
	});
}

function makeOrderForSnapshot(): Record<string, unknown> {
	return {
		id: "nq8kx3v2p7rt9wd4bcfh6mzy",
		orderNumber: "SYN-2026-99999",
		customerEmail: "test@example.com",
		customerName: "Alice",
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
		subtotal: 4500,
		discountAmount: 0,
		taxAmount: 0,
		shippingCost: 0,
		total: 4500,
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
	// Défaut : encaissement clairement en 2026 (15 juin midi, pas d'ambiguïté TZ).
	setPaidAt(new Date("2026-06-15T12:00:00Z"));
});

afterEach(() => {
	vi.useRealTimers();
});

describe("persistInvoiceNumber — year boundary (EINV-TEST-019)", () => {
	it("overflow F-2026-99999 retourne null + log error (limite atteinte)", async () => {
		setPaidAt(new Date("2026-06-15T12:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-99999" }]);

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result).toBeNull();
		expect(mockTx.order.update).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it("une vente encaissée en 2027 démarre à F-2027-00001 (séquence indépendante, pas de continuité)", async () => {
		// paidAt 2027 → prefix "F-2027-%" → SELECT renvoie [] (aucune facture 2027 encore).
		setPaidAt(new Date("2027-01-15T12:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]); // SELECT prefix=F-2027-% returns nothing
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result?.invoiceNumber).toBe("F-2027-00001");
		const queryArg = mockTx.$queryRaw.mock.calls[0]![0];
		expect(queryArg.values[0]).toBe("F-2027-%");
	});

	it("le SELECT 2027 ne voit PAS les factures 2026 (filtre LIKE par préfixe d'année)", async () => {
		setPaidAt(new Date("2027-01-15T12:00:00Z"));
		runTx();
		// Si quelqu'un avait par erreur passé un filtre globalement (sans année),
		// le SELECT verrait "F-2026-99999" en tête → next serait 100000 → overflow.
		// Le test garantit que la valeur LIKE est bien "F-2027-%" pas "F-%".
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		const queryArg = mockTx.$queryRaw.mock.calls[0]![0];
		expect(queryArg.values[0]).toMatch(/^F-2027-%$/);
		expect(queryArg.values[0]).not.toMatch(/^F-2026/);
	});

	it("l'advisory lock key change entre 2026 et 2027 (lock par année, pas global)", async () => {
		// Encaissement 2026
		setPaidAt(new Date("2026-06-15T12:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockResolvedValue({
			invoiceNumber: "F-2026-00001",
			invoiceGeneratedAt: new Date(),
		});
		await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");
		const lockKey2026 = mockTx.$executeRaw.mock.calls[0]![0].values[0];

		// Encaissement 2027
		vi.clearAllMocks();
		mockTx.$executeRaw.mockResolvedValue(undefined);
		mockTx.order.findUnique.mockResolvedValue(makeOrderForSnapshot());
		setPaidAt(new Date("2027-06-15T12:00:00Z"));
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockResolvedValue({
			invoiceNumber: "F-2027-00001",
			invoiceGeneratedAt: new Date(),
		});
		runTx();
		await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");
		const lockKey2027 = mockTx.$executeRaw.mock.calls[0]![0].values[0];

		expect(lockKey2026).toBe(1_000_000 + 2026);
		expect(lockKey2027).toBe(1_000_000 + 2027);
		expect(lockKey2026).not.toBe(lockKey2027);
	});

	it("ne retry PAS l'overflow (BusinessError ≠ P2002) — défaut MAX_RETRIES non déclenché", async () => {
		setPaidAt(new Date("2026-12-31T20:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-99999" }]);

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result).toBeNull();
		// 1 seul appel à $transaction (pas de retry)
		expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		// P2002 testé séparément dans le service test parent
		const error = mockLogger.error.mock.calls[0]?.[1];
		expect((error as { message?: string }).message).toContain("saturée");
	});

	it("F-2026-99998 → F-2026-99999 (dernier numéro autorisé de l'année, pas d'overflow)", async () => {
		setPaidAt(new Date("2026-12-31T20:00:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-99998" }]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result?.invoiceNumber).toBe("F-2026-99999");
	});
});

describe("persistInvoiceNumber — millésime = encaissement, pas génération (EINV-SEQ-002)", () => {
	it("génération tardive en 2027 sur une vente encaissée en 2026 → F-2026 (pas F-2027)", async () => {
		// Cas reconcile-invoices/lazy download qui tourne après le 31/12 : la vente
		// 2026 doit garder un numéro 2026 même générée en 2027.
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2027-01-02T03:00:00Z")); // horloge de génération = 2027
		setPaidAt(new Date("2026-06-15T12:00:00Z")); // encaissement = 2026
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result?.invoiceNumber).toBe("F-2026-00001");
		// Prefix + advisory lock suivent l'année d'encaissement 2026.
		expect(mockTx.$queryRaw.mock.calls[0]![0].values[0]).toBe("F-2026-%");
		expect(mockTx.$executeRaw.mock.calls[0]![0].values[0]).toBe(1_000_000 + 2026);
	});

	it("encaissement 31/12 23:30 UTC = 01/01 00:30 Paris → millésime Paris 2027", async () => {
		// Frontière minuit : le serveur (UTC) lirait 2026, mais en heure de Paris on
		// est déjà en 2027 → la séquence doit suivre Paris.
		setPaidAt(new Date("2026-12-31T23:30:00Z"));
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result?.invoiceNumber).toBe("F-2027-00001");
		expect(mockTx.$queryRaw.mock.calls[0]![0].values[0]).toBe("F-2027-%");
	});

	it("fallback createdAt si paidAt absent (état incohérent)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue({
			...makeOrderForSnapshot(),
			paidAt: null,
			// EINV-SEQ-008 : la garde never-paid exige paidAt != null OU
			// paymentStatus PAID — le fallback createdAt ne s'applique qu'à une
			// commande encaissée dont paidAt manque (état incohérent), pas à une
			// commande jamais payée (refus, testé dans le service test parent).
			paymentStatus: "PAID",
			createdAt: new Date("2025-09-10T12:00:00Z"),
		});
		runTx();
		mockTx.$queryRaw.mockResolvedValue([]);
		mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
			invoiceNumber: args.data.invoiceNumber,
			invoiceGeneratedAt: new Date(),
		}));

		const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

		expect(result?.invoiceNumber).toBe("F-2025-00001");
	});

	it("order introuvable avant résolution séquence → null (pas de tx ouverte)", async () => {
		mockPrisma.order.findUnique.mockResolvedValue(null);
		runTx();

		const result = await persistInvoiceNumber("order-unknown");

		expect(result).toBeNull();
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
		expect(mockLogger.error).toHaveBeenCalled();
	});
});
