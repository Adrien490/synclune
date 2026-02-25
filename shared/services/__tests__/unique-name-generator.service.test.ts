import { describe, it, expect, vi } from "vitest";

import {
	generateUniqueReadableName,
	generateUniqueTechnicalName,
} from "../unique-name-generator.service";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Creates a mock checkExists function that returns true for the first N calls,
 * then returns false, simulating names already taken.
 */
function makeCheckExists(takenCount: number) {
	let calls = 0;
	return vi.fn(async (_name: string) => {
		calls++;
		return calls <= takenCount;
	});
}

/** Always returns false: the first candidate is always free */
function neverExists() {
	return vi.fn(async (_name: string) => false);
}

/** Always returns true: simulate all names taken */
function alwaysExists() {
	return vi.fn(async (_name: string) => true);
}

// ============================================================================
// generateUniqueReadableName
// ============================================================================

describe("generateUniqueReadableName", () => {
	it("should return success with 'Nom (copie)' when first candidate is free", async () => {
		const checkExists = neverExists();
		const result = await generateUniqueReadableName("Mon Produit", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("Mon Produit (copie)");
	});

	it("should check the '(copie)' variant first", async () => {
		const checkExists = neverExists();
		await generateUniqueReadableName("Test", checkExists);
		expect(checkExists).toHaveBeenCalledWith("Test (copie)");
	});

	it("should fall back to '(copie 2)' when '(copie)' already exists", async () => {
		const checkExists = makeCheckExists(1);
		const result = await generateUniqueReadableName("Bague Or", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("Bague Or (copie 2)");
	});

	it("should fall back to '(copie 3)' when '(copie)' and '(copie 2)' exist", async () => {
		const checkExists = makeCheckExists(2);
		const result = await generateUniqueReadableName("Bague Or", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("Bague Or (copie 3)");
	});

	it("should return failure when all attempts exhausted (maxAttempts=2)", async () => {
		const checkExists = alwaysExists();
		const result = await generateUniqueReadableName("Test", checkExists, 2);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/2/);
		expect(result.name).toBeUndefined();
	});

	it("should respect the maxAttempts parameter", async () => {
		const checkExists = makeCheckExists(3);
		const result = await generateUniqueReadableName("Test", checkExists, 3);
		// 3 taken (copie, copie 2, copie 3) → maxAttempts=3 means we try up to copie 3
		// (copie) = call 1 (taken), (copie 2) = call 2 (taken), (copie 3) = call 3 (taken)
		// → all maxAttempts exhausted
		expect(result.success).toBe(false);
	});

	it("should work with an empty string as original name", async () => {
		const checkExists = neverExists();
		const result = await generateUniqueReadableName("", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe(" (copie)");
	});

	it("should work with special characters in name", async () => {
		const checkExists = neverExists();
		const result = await generateUniqueReadableName("Collier & Bague (été)", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("Collier & Bague (été) (copie)");
	});
});

// ============================================================================
// generateUniqueTechnicalName
// ============================================================================

describe("generateUniqueTechnicalName", () => {
	it("should return success with 'CODE-COPY' when first candidate is free", async () => {
		const checkExists = neverExists();
		const result = await generateUniqueTechnicalName("SKU-001", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("SKU-001-COPY");
	});

	it("should check the '-COPY' variant first", async () => {
		const checkExists = neverExists();
		await generateUniqueTechnicalName("SKU-001", checkExists);
		expect(checkExists).toHaveBeenCalledWith("SKU-001-COPY");
	});

	it("should fall back to '-COPY-2' when '-COPY' already exists", async () => {
		const checkExists = makeCheckExists(1);
		const result = await generateUniqueTechnicalName("SKU-001", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("SKU-001-COPY-2");
	});

	it("should fall back to '-COPY-3' when '-COPY' and '-COPY-2' exist", async () => {
		const checkExists = makeCheckExists(2);
		const result = await generateUniqueTechnicalName("SKU-001", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("SKU-001-COPY-3");
	});

	it("should return failure when all attempts exhausted (maxAttempts=2)", async () => {
		const checkExists = alwaysExists();
		const result = await generateUniqueTechnicalName("CODE", checkExists, 2);
		expect(result.success).toBe(false);
		expect(result.error).toMatch(/2/);
		expect(result.name).toBeUndefined();
	});

	it("should use the default maxAttempts of 100", async () => {
		// Simulate 50 taken names, should still succeed on attempt 51
		const checkExists = makeCheckExists(50);
		const result = await generateUniqueTechnicalName("CODE", checkExists);
		expect(result.success).toBe(true);
		expect(result.name).toBe("CODE-COPY-51");
	});
});
