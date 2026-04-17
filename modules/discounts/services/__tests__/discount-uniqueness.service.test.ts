import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
	mockPrisma: {
		discount: { findUnique: vi.fn() },
	},
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

import { isCodeAvailable } from "../discount-uniqueness.service";

describe("isCodeAvailable", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("returns true when code does not exist", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		await expect(isCodeAvailable("NEW-CODE")).resolves.toBe(true);

		expect(mockPrisma.discount.findUnique).toHaveBeenCalledWith({
			where: { code: "NEW-CODE" },
			select: { id: true },
		});
	});

	it("returns false when code is taken by another discount", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "other-id" });

		await expect(isCodeAvailable("EXISTS")).resolves.toBe(false);
	});

	it("returns true when code is taken by the same id (excludeId)", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "same-id" });

		await expect(isCodeAvailable("OWN", "same-id")).resolves.toBe(true);
	});

	it("returns false when code is taken by a different id even with excludeId", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "other-id" });

		await expect(isCodeAvailable("CONFLICT", "my-id")).resolves.toBe(false);
	});
});
