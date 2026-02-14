import { describe, expect, it, vi } from "vitest"

import { setTrigramThreshold } from "./trigram-helpers"

function createMockTx() {
	return {
		$executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
	}
}

describe("setTrigramThreshold", () => {
	it("executes SET LOCAL with a valid threshold", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 0.3)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 0.3"
		)
	})

	it("clamps threshold above 1 to 1", async () => {
		const tx = createMockTx()
		await setTrigramThreshold(tx as any, 1.5)
		expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
			"SET LOCAL pg_trgm.similarity_threshold = 1"
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
