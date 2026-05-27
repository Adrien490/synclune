import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// Mocks
// ============================================================================

const { mockTx, mockPrisma, mockUpdateTag, mockLogger } = vi.hoisted(() => {
	const mockTx = {
		$executeRaw: vi.fn(),
		$queryRaw: vi.fn(),
		order: {
			update: vi.fn(),
		},
		orderHistory: {
			create: vi.fn(),
		},
	};
	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn(),
		},
		mockUpdateTag: vi.fn(),
		mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: vi.fn((_userId?: string, _orderId?: string) => [
		"orders-list",
		"order-detail",
	]),
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

beforeEach(() => {
	vi.clearAllMocks();
	mockTx.$executeRaw.mockResolvedValue(undefined);
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

			const result = await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

			const sequence = result!.invoiceNumber.split("-")[2];
			expect(sequence).toHaveLength(5);
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

			const result = await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

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

			await persistInvoiceNumber("order-1", "user-1");

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

			await persistInvoiceNumber("order-1", "user-1");

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

			await persistInvoiceNumber("order-1", "user-1");

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

			await persistInvoiceNumber("order-1", "user-1");

			expect(mockTx.order.update).toHaveBeenCalledWith({
				where: { id: "order-1" },
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

			await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", null);

			expect(result).not.toBeNull();
			expect(result!.invoiceNumber).toBe("F-2026-00001");
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

			const result = await persistInvoiceNumber("order-1", "user-1");

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
			expect(result?.invoiceNumber).toBe("F-2026-00006");
		});

		it("returns null after MAX_RETRIES P2002 errors", async () => {
			mockPrisma.$transaction.mockRejectedValue(makeP2002Error());

			const result = await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

			expect(result).toBeNull();
			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});

		it("does NOT retry on P2001 (wrong code)", async () => {
			const p2001Error = new Prisma.PrismaClientKnownRequestError("Record not found", {
				code: "P2001",
				clientVersion: "test",
			});
			mockPrisma.$transaction.mockRejectedValue(p2001Error);

			const result = await persistInvoiceNumber("order-1", "user-1");

			expect(result).toBeNull();
			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});
	});

	describe("error handling", () => {
		it("returns null when transaction throws non-Prisma error", async () => {
			mockPrisma.$transaction.mockRejectedValue(new Error("DB unreachable"));

			const result = await persistInvoiceNumber("order-1", "user-1");

			expect(result).toBeNull();
		});

		it("does NOT invalidate cache tags on failure", async () => {
			mockPrisma.$transaction.mockRejectedValue(new Error("DB unreachable"));

			await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

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

		it("does NOT retry on overflow (BusinessError ≠ P2002)", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99999` }]);

			await persistInvoiceNumber("order-1", "user-1");

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

			const result = await persistInvoiceNumber("order-1", "user-1");

			expect(result?.invoiceNumber).toBe(`F-${year}-99999`);
		});

		it("does NOT invalidate cache tags on overflow", async () => {
			runTx();
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-99999` }]);

			await persistInvoiceNumber("order-1", "user-1");

			expect(mockUpdateTag).not.toHaveBeenCalled();
		});
	});
});
