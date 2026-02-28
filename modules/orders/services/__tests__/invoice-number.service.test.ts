import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/app/generated/prisma/client";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockTx, mockPrisma } = vi.hoisted(() => {
	const mockTx = {
		$queryRaw: vi.fn(),
	};

	return {
		mockTx,
		mockPrisma: {
			$transaction: vi.fn(),
		},
	};
});

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { generateInvoiceNumber } from "../invoice-number.service";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Builds a minimal PrismaClientKnownRequestError for P2002 (unique constraint).
 * Uses the real constructor so instanceof checks pass.
 */
function makeP2002Error(): Prisma.PrismaClientKnownRequestError {
	return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
		code: "P2002",
		clientVersion: "test",
	});
}

// ============================================================================
// generateInvoiceNumber
// ============================================================================

describe("generateInvoiceNumber", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: transaction executes the callback with mockTx
		mockPrisma.$transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<string>) =>
			cb(mockTx),
		);
	});

	// --------------------------------------------------------------------------
	// Format
	// --------------------------------------------------------------------------

	describe("invoice number format", () => {
		it("should return a string matching F-YYYY-NNNNN format", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			const result = await generateInvoiceNumber();

			expect(result).toMatch(/^F-\d{4}-\d{5}$/);
		});

		it("should use the current year in the invoice number", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);
			const year = new Date().getFullYear();

			const result = await generateInvoiceNumber();

			expect(result).toContain(`F-${year}-`);
		});

		it("should pad the sequence number to 5 digits", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			const result = await generateInvoiceNumber();

			const parts = result.split("-");
			const sequence = parts[2];
			expect(sequence).toHaveLength(5);
		});
	});

	// --------------------------------------------------------------------------
	// Sequence logic
	// --------------------------------------------------------------------------

	describe("sequence generation", () => {
		it("should generate F-YYYY-00001 when no previous invoice exists for the year", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);
			const year = new Date().getFullYear();

			const result = await generateInvoiceNumber();

			expect(result).toBe(`F-${year}-00001`);
		});

		it("should increment from the last invoice number", async () => {
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-00041` }]);

			const result = await generateInvoiceNumber();

			expect(result).toBe(`F-${year}-00042`);
		});

		it("should increment from a high sequence number and keep 5-digit padding", async () => {
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-00099` }]);

			const result = await generateInvoiceNumber();

			expect(result).toBe(`F-${year}-00100`);
		});

		it("should treat a null invoiceNumber row as no previous invoice and start at 1", async () => {
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: null }]);
			const year = new Date().getFullYear();

			const result = await generateInvoiceNumber();

			expect(result).toBe(`F-${year}-00001`);
		});

		it("should treat a row with an unparseable sequence as no previous invoice and start at 1", async () => {
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-XXXXX` }]);

			const result = await generateInvoiceNumber();

			expect(result).toBe(`F-${year}-00001`);
		});
	});

	// --------------------------------------------------------------------------
	// Row locking (FOR UPDATE)
	// --------------------------------------------------------------------------

	describe("row locking", () => {
		it("should execute the SELECT query inside a transaction", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			await generateInvoiceNumber();

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
			expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
		});

		it("should include FOR UPDATE in the raw SQL query to prevent race conditions", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			await generateInvoiceNumber();

			const sqlArg = mockTx.$queryRaw.mock.calls[0]![0];
			// Prisma.sql tagged template literals expose the SQL strings array
			const sqlText = sqlArg.strings.join("");
			expect(sqlText).toContain("FOR UPDATE");
		});

		it("should query the Order table filtering by current year prefix", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);
			const year = new Date().getFullYear();

			await generateInvoiceNumber();

			const sqlArg = mockTx.$queryRaw.mock.calls[0]![0];
			const sqlText = sqlArg.strings.join("");
			expect(sqlText).toContain('"Order"');
			expect(sqlText).toContain('"invoiceNumber"');
			// The prefix value is passed as an interpolated parameter, not inline
			const values = sqlArg.values;
			expect(values[0]).toBe(`F-${year}-%`);
		});

		it("should order results DESC to pick the highest invoice number", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			await generateInvoiceNumber();

			const sqlArg = mockTx.$queryRaw.mock.calls[0]![0];
			const sqlText = sqlArg.strings.join("");
			expect(sqlText).toContain("DESC");
		});

		it("should limit the query to 1 result", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			await generateInvoiceNumber();

			const sqlArg = mockTx.$queryRaw.mock.calls[0]![0];
			const sqlText = sqlArg.strings.join("");
			expect(sqlText).toContain("LIMIT 1");
		});
	});

	// --------------------------------------------------------------------------
	// Retry logic
	// --------------------------------------------------------------------------

	describe("retry on unique constraint violation", () => {
		it("should retry once on P2002 and succeed on the second attempt", async () => {
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-00005` }]);

			// First call throws P2002, second succeeds
			mockPrisma.$transaction
				.mockImplementationOnce(() => Promise.reject(makeP2002Error()))
				.mockImplementationOnce((cb: (tx: typeof mockTx) => Promise<string>) => cb(mockTx));

			const result = await generateInvoiceNumber();

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
			expect(result).toBe(`F-${year}-00006`);
		});

		it("should retry up to MAX_RETRIES - 1 times on consecutive P2002 errors", async () => {
			const year = new Date().getFullYear();
			mockTx.$queryRaw.mockResolvedValue([{ invoiceNumber: `F-${year}-00010` }]);

			// Fail 4 times (attempts 0-3), succeed on 5th (attempt 4, index 4 = MAX_RETRIES - 1)
			mockPrisma.$transaction
				.mockImplementationOnce(() => Promise.reject(makeP2002Error()))
				.mockImplementationOnce(() => Promise.reject(makeP2002Error()))
				.mockImplementationOnce(() => Promise.reject(makeP2002Error()))
				.mockImplementationOnce(() => Promise.reject(makeP2002Error()))
				.mockImplementationOnce((cb: (tx: typeof mockTx) => Promise<string>) => cb(mockTx));

			const result = await generateInvoiceNumber();

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(5);
			expect(result).toBe(`F-${year}-00011`);
		});

		it("should throw after MAX_RETRIES consecutive P2002 errors", async () => {
			// All 5 attempts throw P2002. On the last attempt (attempt === MAX_RETRIES - 1)
			// the retry guard is false so the P2002 error itself is re-thrown.
			mockPrisma.$transaction.mockRejectedValue(makeP2002Error());

			await expect(generateInvoiceNumber()).rejects.toThrow("Unique constraint failed");

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(5);
		});

		it("should rethrow non-P2002 errors immediately without retrying", async () => {
			const dbError = new Error("Connection refused");
			mockPrisma.$transaction.mockRejectedValue(dbError);

			await expect(generateInvoiceNumber()).rejects.toThrow("Connection refused");

			// Must not retry on generic errors
			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});

		it("should rethrow a P2001 Prisma error (wrong code) immediately without retrying", async () => {
			const p2001Error = new Prisma.PrismaClientKnownRequestError("Record not found", {
				code: "P2001",
				clientVersion: "test",
			});
			mockPrisma.$transaction.mockRejectedValue(p2001Error);

			await expect(generateInvoiceNumber()).rejects.toThrow("Record not found");

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Transaction contract
	// --------------------------------------------------------------------------

	describe("transaction usage", () => {
		it("should wrap the sequence read inside a single $transaction call per attempt", async () => {
			mockTx.$queryRaw.mockResolvedValue([]);

			await generateInvoiceNumber();

			expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
		});

		it("should return the invoice number produced by the transaction callback", async () => {
			const year = new Date().getFullYear();
			mockPrisma.$transaction.mockResolvedValue(`F-${year}-00007`);

			const result = await generateInvoiceNumber();

			expect(result).toBe(`F-${year}-00007`);
		});
	});
});
