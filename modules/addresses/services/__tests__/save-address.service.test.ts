import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSanitizeText } = vi.hoisted(() => ({
	mockSanitizeText: vi.fn((text: string) => text),
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeText: mockSanitizeText,
}));

import { saveAddressInTransaction, type SaveAddressInput } from "../save-address.service";
import { MAX_ADDRESSES_PER_USER } from "../../constants/address.constants";

interface TxStub {
	address: {
		count: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
	};
}

function makeTx(): TxStub {
	return {
		address: {
			count: vi.fn(),
			create: vi.fn().mockResolvedValue({ id: "addr-new" }),
		},
	};
}

const baseInput: SaveAddressInput = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	address2: null,
	postalCode: "75001",
	city: "Paris",
	country: "FR",
	phone: "+33612345678",
};

describe("saveAddressInTransaction", () => {
	beforeEach(() => {
		mockSanitizeText.mockReset().mockImplementation((text: string) => text);
	});

	it("returns limit reason when user has reached MAX_ADDRESSES_PER_USER", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(MAX_ADDRESSES_PER_USER);

		const result = await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			baseInput,
		);

		expect(result).toEqual({ saved: false, reason: "limit" });
		expect(tx.address.create).not.toHaveBeenCalled();
	});

	it("returns limit reason when user is over the limit", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(MAX_ADDRESSES_PER_USER + 5);

		const result = await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			baseInput,
		);

		expect(result).toEqual({ saved: false, reason: "limit" });
		expect(tx.address.create).not.toHaveBeenCalled();
	});

	it("creates the first address as default", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(0);

		const result = await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			baseInput,
		);

		expect(result).toEqual({ saved: true, isDefault: true });
		expect(tx.address.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ userId: "user-1", isDefault: true }),
		});
	});

	it("creates subsequent addresses as non-default", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(3);

		const result = await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			baseInput,
		);

		expect(result).toEqual({ saved: true, isDefault: false });
		expect(tx.address.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ userId: "user-1", isDefault: false }),
		});
	});

	it("sanitizes text fields before persisting", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(1);
		mockSanitizeText.mockImplementation((text: string) => `clean:${text}`);

		await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			{ ...baseInput, address2: "Bat A" },
		);

		expect(mockSanitizeText).toHaveBeenCalledWith("Marie");
		expect(mockSanitizeText).toHaveBeenCalledWith("Dupont");
		expect(mockSanitizeText).toHaveBeenCalledWith("12 Rue de la Paix");
		expect(mockSanitizeText).toHaveBeenCalledWith("Bat A");
		expect(mockSanitizeText).toHaveBeenCalledWith("Paris");

		expect(tx.address.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				firstName: "clean:Marie",
				address2: "clean:Bat A",
				city: "clean:Paris",
			}),
		});
	});

	it("does not sanitize address2 when null", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(1);

		await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			{ ...baseInput, address2: null },
		);

		expect(tx.address.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ address2: null }),
		});
	});

	it("scopes count and create to the provided userId", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(0);

		await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-xyz",
			baseInput,
		);

		expect(tx.address.count).toHaveBeenCalledWith({ where: { userId: "user-xyz" } });
		expect(tx.address.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ userId: "user-xyz" }),
		});
	});

	it("preserves country and phone untouched (no sanitize)", async () => {
		const tx = makeTx();
		tx.address.count.mockResolvedValue(0);

		await saveAddressInTransaction(
			tx as unknown as Parameters<typeof saveAddressInTransaction>[0],
			"user-1",
			baseInput,
		);

		expect(mockSanitizeText).not.toHaveBeenCalledWith("FR");
		expect(mockSanitizeText).not.toHaveBeenCalledWith("+33612345678");
		expect(mockSanitizeText).not.toHaveBeenCalledWith("75001");

		expect(tx.address.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				country: "FR",
				phone: "+33612345678",
				postalCode: "75001",
			}),
		});
	});
});
