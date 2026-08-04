import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// Mocks
// ============================================================================

const { mockTx, mockPrisma, mockUpdateTag, mockLogger, mockSendAdminSequenceOverflowAlert } =
	vi.hoisted(() => {
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
			mockPrisma: {
				$transaction: vi.fn(),
				// EINV-SEQ-002 : lookup hors transaction de paidAt/createdAt pour dériver
				// le millésime de la séquence (Europe/Paris).
				order: { findUnique: vi.fn() },
			},
			mockUpdateTag: vi.fn(),
			mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
			mockSendAdminSequenceOverflowAlert: vi.fn().mockResolvedValue(undefined),
		};
	});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

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
	getOrderInvalidationTags: vi.fn((_userId?: string, _orderId?: string) => [
		"orders-list",
		"order-detail",
	]),
}));

// Fix C — l'alerte overflow (sous-type sequence-overflow) doit être assertée :
// sans mock + assertion, supprimer le câblage laisserait les tests verts.
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminSequenceOverflowAlert: mockSendAdminSequenceOverflowAlert,
}));

import { persistInvoiceNumber } from "../persist-invoice-number.service";

// ============================================================================
// Helpers
// ============================================================================

function makeP2002Error(): Prisma.PrismaClientKnownRequestError {
	return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
		code: "P2002",
		clientVersion: "test",
	});
}

function runTx() {
	mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) =>
		cb(mockTx),
	);
}

/**
 * Mock minimal d'Order pour `buildInvoiceData` inside persistInvoiceNumber tx.
 * Doit contenir tous les champs lus par build-invoice-data + tax fields snapshot
 * (Phase 2A) + B2B fields (Phase 2A). Le payload InvoiceData résultant doit
 * être complet pour que canonical-JSON + SHA-256 fonctionnent.
 */
function makeOrderForSnapshot(): Record<string, unknown> {
	return {
		id: "nq8kx3v2p7rt9wd4bcfh6mzy",
		orderNumber: "SYN-2026-00001",
		customerEmail: "test@example.com",
		customerName: "Alice Dupont",
		customerCompanyName: null,
		customerCompanySiren: null,
		customerCompanySiret: null,
		customerCompanyVatNumber: null,
		shippingFirstName: "Alice",
		shippingLastName: "Dupont",
		shippingAddress1: "10 rue de la Paix",
		shippingAddress2: null,
		shippingPostalCode: "75002",
		shippingCity: "Paris",
		shippingCountry: "FR",
		shippingPhone: "+33600000000",
		subtotal: 9000,
		discountAmount: 0,
		taxAmount: 0,
		shippingCost: 500,
		total: 9500,
		paymentMethod: "CARD",
		paidAt: new Date("2026-05-28T10:00:00Z"),
		stripePaymentIntentId: "pi_test_1",
		items: [
			{
				id: "item-1",
				productTitle: "Collier",
				productDescription: null,
				productImageUrl: null,
				skuSku: "SKU-1",
				skuColor: "Argent",
				skuColorHexes: null,
				skuMaterial: "Argent 925",
				skuSize: null,
				price: 4500,
				quantity: 2,
				taxRate: 0,
				taxAmount: 0,
				lineTotalExcludingTax: 9000,
				lineTotalIncludingTax: 9000,
				taxCategoryCode: "ZB",
			},
		],
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.$executeRaw.mockResolvedValue(undefined);
	mockTx.order.findUnique.mockResolvedValue(makeOrderForSnapshot());
	// EINV-SEQ-002 + EINV-SEQ-005 : lecture order unique hors lock, sert au millésime
	// (paidAt = 15 juin midi de l'année courante → millésime Paris ==
	// `new Date().getFullYear()`, conserve les assertions `F-${year}`) ET au snapshot
	// (order complet → buildInvoiceData). Plus de findUnique dans la transaction.
	mockPrisma.order.findUnique.mockResolvedValue({
		...makeOrderForSnapshot(),
		paidAt: new Date(Date.UTC(new Date().getFullYear(), 5, 15, 12, 0, 0)),
		createdAt: new Date(Date.UTC(new Date().getFullYear(), 5, 15, 12, 0, 0)),
	});
});

// ============================================================================
// persistInvoiceNumber
// ============================================================================

describe("persistInvoiceNumber — generation + persistence atomique", () => {
	describe("format", () => {
		it("matches F-YYYY-NNNNN with current year", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);
			expect(result?.invoiceNumber).toContain(`F-${year}-`);
		});



		it("pads the sequence to 5 digits", async () => {
			runTx();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			const sequence = result!.invoiceNumber.split("-")[2];
			expect(sequence).toHaveLength(5);
		});
	});

	describe("emission atomique (Art. 286 CGI)", () => {
		// Le snapshot de donnees a ete retire le 2026-08-05 : la piece probante est le
		// PDF archive, et l'identite vendeur n'y vit que parce qu'elle y est imprimee.
		// Ce qui doit rester vrai ICI : les trois colonnes d'emission sont ecrites
		// ENSEMBLE, en un seul `update`. Une facture numerotee sans `invoiceStatus`
		// ni `invoiceGeneratedAt` serait un document a moitie ne, que ni la DLQ ni
		// l'ecran Facturation ne sauraient classer.
		it("ecrit numero + statut + date d'emission dans un SEUL prisma.order.update", async () => {
			runTx();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockTx.order.update).toHaveBeenCalledOnce();
			const updateArgs = mockTx.order.update.mock.calls[0]?.[0] as {
				data: {
					invoiceNumber: string;
					invoiceStatus?: string;
					invoiceGeneratedAt?: Date;
				};
			};
			expect(updateArgs.data.invoiceNumber).toMatch(/^F-\d{4}-\d{5}$/);
			expect(updateArgs.data.invoiceStatus).toBe("GENERATED");
			expect(updateArgs.data.invoiceGeneratedAt).toBeInstanceOf(Date);
		});
	});

	describe("sequence", () => {
		it("starts at F-YYYY-00001 when no previous invoice exists (premier numéro d'année)", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe(`F-${year}-00001`);
		});

		it("increments from the last invoice number", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-00041` }]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe(`F-${year}-00042`);
		});

		it("treats null invoiceNumber row as no previous invoice", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: null }]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe(`F-${year}-00001`);
		});

		it("treats unparseable sequence as no previous invoice", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-XXXXX` }]);
			mockTx.order.update.mockImplementation(async (args: { data: { invoiceNumber: string } }) => ({
				invoiceNumber: args.data.invoiceNumber,
				invoiceGeneratedAt: new Date(),
			}));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe(`F-${year}-00001`);
		});
	});

	describe("atomicity — advisory lock + SELECT + UPDATE in 1 tx", () => {
		it("acquires pg_advisory_xact_lock first inside the transaction", async () => {
			runTx();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
			});

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
			const lockSql = mockTx.$executeRaw.mock.calls[0]![0];
			const lockText = lockSql.strings.join("");
			expect(lockText).toContain("pg_advisory_xact_lock");
		});

		it("uses a year-derived advisory lock key", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: `F-${year}-00001`,
				invoiceGeneratedAt: new Date(),
			});

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			const lockSql = mockTx.$executeRaw.mock.calls[0]![0];
			const values = lockSql.values;
			expect(values[0]).toBe(1_000_000 + year);
		});

		it("SELECT filters by current year prefix", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: `F-${year}-00001`,
				invoiceGeneratedAt: new Date(),
			});

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			const sqlArg = mockTx.$queryRaw.mock.calls[0]![0];
			const sqlText = sqlArg.strings.join("");
			expect(sqlText).toContain('"Order"');
			expect(sqlText).toContain('"invoiceNumber"');
			expect(sqlArg.values[0]).toBe(`F-${year}-%`);
		});

		it("UPDATE persists invoiceNumber + GENERATED status + generatedAt", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: `F-${year}-00001`,
				invoiceGeneratedAt: new Date(),
			});

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockTx.order.update).toHaveBeenCalledWith({
				where: { id: "nq8kx3v2p7rt9wd4bcfh6mzy" },
				data: expect.objectContaining({
					invoiceNumber: `F-${year}-00001`,
					invoiceStatus: "GENERATED",
				}),
				select: { invoiceNumber: true, invoiceGeneratedAt: true },
			});
		});

		it("invalidates cache tags after successful persistence", async () => {
			runTx();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
			});

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockUpdateTag).toHaveBeenCalledWith("orders-list");
			expect(mockUpdateTag).toHaveBeenCalledWith("order-detail");
		});

		it("handles null userId for guest orders", async () => {
			runTx();
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
			});

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).not.toBeNull();
			expect(result!.invoiceNumber).toBe("F-2026-00001");
		});
	});

	/**
	 * @regression invoice-idempotent-under-lock-2026-05-29
	 *
	 * EINV-SEQ-006 — race eager (webhook) vs lazy (route download) : les callers
	 * pré-vérifient `invoiceNumber` HORS du lock advisory. Sous concurrence, deux
	 * chemins passent leur garde puis se sérialisent dans la tx. Sans re-lecture
	 * SOUS le lock, le 2e écraserait le numéro émis (mutation Art. 286) en
	 * orphelinisant le 1er (gap). La garde re-lit `invoiceNumber` après le lock et
	 * retourne l'existant en noop (pas de MAX+1, pas d'UPDATE, pas d'audit).
	 */
	describe("idempotence sous lock (EINV-SEQ-006)", () => {
		it("retourne le numéro existant sans réémettre quand invoiceNumber est déjà posé", async () => {
			runTx();
			const existingDate = new Date("2026-05-28T10:00:00Z");
			// Re-lecture SOUS le lock : la commande a déjà un numéro (posé par un
			// chemin concurrent qui a commit en premier).
			mockTx.order.findUnique.mockResolvedValue({
				invoiceNumber: "F-2026-00007",
				invoiceGeneratedAt: existingDate,
			});

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe("F-2026-00007");
			// Pas de génération : ni lookup MAX, ni UPDATE, ni audit.
			expect(mockTx.$queryRaw).not.toHaveBeenCalled();
			expect(mockTx.order.update).not.toHaveBeenCalled();
			expect(mockTx.orderHistory.create).not.toHaveBeenCalled();
			// Pas d'invalidation cache sur le noop.
			expect(mockUpdateTag).not.toHaveBeenCalled();
		});

		it("le lock advisory est tout de même acquis avant la re-lecture (sérialisation)", async () => {
			runTx();
			mockTx.order.findUnique.mockResolvedValue({
				invoiceNumber: "F-2026-00007",
				invoiceGeneratedAt: new Date(),
			});

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
			const lockText = mockTx.$executeRaw.mock.calls[0]![0].strings.join("");
			expect(lockText).toContain("pg_advisory_xact_lock");
		});
	});

	describe("retry on P2002 unique violation", () => {
		it("retries the full tx on P2002 and succeeds on second attempt", async () => {
			mockPrisma.$transaction
				.mockImplementationOnce(() => Promise.reject(makeP2002Error()))
				.mockImplementationOnce(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
					mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: "F-2026-00005" }]);
					mockTx.order.update.mockResolvedValueOnce({
						invoiceNumber: "F-2026-00006",
						invoiceGeneratedAt: new Date(),
					});
					return cb(mockTx);
				});

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
			expect(result?.invoiceNumber).toBe("F-2026-00006");
		});

		it("returns null after MAX_RETRIES P2002 errors", async () => {
			mockPrisma.$transaction.mockRejectedValue(makeP2002Error());

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).toBeNull();
			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(5);
			expect(mockLogger.error).toHaveBeenCalledWith(
				"Failed to persist invoice number",
				expect.any(Error),
				expect.objectContaining({ service: "persist-invoice-number" }),
			);
		});

		it("does NOT retry on non-P2002 errors", async () => {
			mockPrisma.$transaction.mockRejectedValue(new Error("Connection refused"));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).toBeNull();
			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});

		it("does NOT retry on P2001 (wrong code)", async () => {
			const p2001Error = new Prisma.PrismaClientKnownRequestError("Record not found", {
				code: "P2001",
				clientVersion: "test",
			});
			mockPrisma.$transaction.mockRejectedValue(p2001Error);

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).toBeNull();
			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});
	});

	describe("error handling", () => {
		it("returns null when transaction throws non-Prisma error", async () => {
			mockPrisma.$transaction.mockRejectedValue(new Error("DB unreachable"));

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).toBeNull();
		});

		it("does NOT invalidate cache tags on failure", async () => {
			mockPrisma.$transaction.mockRejectedValue(new Error("DB unreachable"));

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});
	});

	/**
	 * @regression invoice-sequence-overflow-2026-05-27
	 *
	 * Le CHECK constraint DB `Order_invoiceNumber_format` n'accepte que des
	 * numéros à 5 chiffres (`^F-[0-9]{4}-[0-9]{5}$`). Au-delà de 99 999, le
	 * service doit refuser net plutôt que générer un numéro qui passerait
	 * silencieusement la regex JavaScript mais provoquerait une P2002 (CHECK
	 * fail) — retentée 4 fois en vain par la boucle de retry.
	 */
	describe("rollover guard at 99999 (Art. 286 CGI — séquence bornée)", () => {
		it("returns null + logs error when last invoice is F-YYYY-99999 (overflow)", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99999` }]);

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).toBeNull();
			expect(mockTx.order.update).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				"Failed to persist invoice number",
				expect.objectContaining({
					name: "BusinessError",
					message: expect.stringContaining("Séquence facture saturée"),
				}),
				expect.objectContaining({ service: "persist-invoice-number" }),
			);
		});

		it("alerte l'admin (sequence-overflow, documentType invoice) sur saturation — Fix C", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99999` }]);

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockSendAdminSequenceOverflowAlert).toHaveBeenCalledWith({
				year,
				documentType: "invoice",
			});
		});

		it("does NOT retry on overflow (BusinessError ≠ P2002)", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99999` }]);

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});

		it("still emits F-YYYY-99999 when last is F-YYYY-99998 (limit not exceeded)", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99998` }]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: `F-${year}-99999`,
				invoiceGeneratedAt: new Date(),
			});

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe(`F-${year}-99999`);
		});

		it("does NOT invalidate cache tags on overflow", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99999` }]);

			await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});
	});

	// EINV-SEQ-008 — garde interne « jamais encaissée » (Art. 289-I CGI).
	// Défense en profondeur : les callers gatent déjà PAID, mais le service doit
	// refuser par lui-même toute commande sans encaissement.
	describe("never-paid guard (EINV-SEQ-008)", () => {
		it("returns null WITHOUT opening a transaction when paidAt is null and status is not PAID", async () => {
			runTx();
			const order = makeOrderForSnapshot();
			order.paidAt = null;
			order.paymentStatus = "PENDING";
			mockPrisma.order.findUnique.mockResolvedValue(order);

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result).toBeNull();
			expect(mockPrisma.$transaction).not.toHaveBeenCalled();
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining("never-paid"),
				undefined,
				expect.objectContaining({ orderId: "nq8kx3v2p7rt9wd4bcfh6mzy" }),
			);
		});

		it("still invoices when paidAt is set even if status moved past PAID (partial refund before invoice)", async () => {
			runTx();
			const order = makeOrderForSnapshot();
			order.paymentStatus = "PARTIALLY_REFUNDED"; // paidAt reste non-null (makeOrderForSnapshot)
			mockPrisma.order.findUnique.mockResolvedValue(order);
			mockTx.order.findUnique.mockResolvedValue({ invoiceNumber: null });
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
			});

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe("F-2026-00001");
		});

		it("still invoices a plain PAID order (paymentStatus PAID)", async () => {
			runTx();
			const order = makeOrderForSnapshot();
			order.paymentStatus = "PAID";
			mockPrisma.order.findUnique.mockResolvedValue(order);
			mockTx.order.findUnique.mockResolvedValue({ invoiceNumber: null });
			mockTx.$queryRaw.mockResolvedValue([]);
			mockTx.order.update.mockResolvedValue({
				invoiceNumber: "F-2026-00001",
				invoiceGeneratedAt: new Date(),
			});

			const result = await persistInvoiceNumber("nq8kx3v2p7rt9wd4bcfh6mzy");

			expect(result?.invoiceNumber).toBe("F-2026-00001");
		});
	});
});
