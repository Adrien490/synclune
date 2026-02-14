import { describe, expect, it, vi } from "vitest"

import { setStatementTimeout, setTrigramThreshold } from "./trigram-helpers"

function createMockTx() {
	return {
		$executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
	}
}

describe("setTrigramThreshold", () => {
	it("sets both similarity and word_similarity thresholds", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 0.3)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(2)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 0.3"
		)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.word_similarity_threshold = 0.3"
		)
	})

	it("clamps threshold above 1 to 1", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 1.5)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 1"
		)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.word_similarity_threshold = 1"
		)
	})

	it("clamps negative threshold to 0", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, -0.5)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 0"
		)
	})

	it("handles boundary value 0", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 0)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 0"
		)
	})

	it("handles boundary value 1", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 1)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 1"
		)
	})

	it("handles fractional values correctly", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 0.55)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 0.55"
		)
	})

	it("throws for NaN threshold", async () => {
		const tx = createMockTx()
		await expect(setTrigramThreshold(tx as any, NaN)).rejects.toThrow(
			"Invalid trigram threshold value"
		)
		expect(tx.$executeRawUnsafe).not.toHaveBeenCalled()
	})

	it("clamps Infinity to 1", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, Infinity)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 1"
		)
	})

	it("clamps -Infinity to 0", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, -Infinity)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 0"
		)
	})
})

// ─── setStatementTimeout ──────────────────────────────────────────

describe("setStatementTimeout", () => {
	it("sets statement_timeout with valid milliseconds", async () => {
		const tx = createMockTx()
		await setStatementTimeout(tx as any, 2000)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL statement_timeout = '2000ms'"
		)
	})

	it("rounds fractional milliseconds", async () => {
		const tx = createMockTx()
		await setStatementTimeout(tx as any, 1500.7)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL statement_timeout = '1501ms'"
		)
	})

	it("clamps negative values to 0", async () => {
		const tx = createMockTx()
		await setStatementTimeout(tx as any, -100)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL statement_timeout = '0ms'"
		)
	})

	it("throws for NaN", async () => {
		const tx = createMockTx()
		await expect(setStatementTimeout(tx as any, NaN)).rejects.toThrow(
			"Invalid statement timeout value"
		)
		expect(tx.$executeRawUnsafe).not.toHaveBeenCalled()
	})

	it("handles zero timeout", async () => {
		const tx = createMockTx()
		await setStatementTimeout(tx as any, 0)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL statement_timeout = '0ms'"
		)
	})
})
