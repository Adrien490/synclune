import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockToggleFabVisibility } = vi.hoisted(() => ({
	mockToggleFabVisibility: vi.fn(),
}));

vi.mock("./toggle-fab-visibility", () => ({
	toggleFabVisibility: mockToggleFabVisibility,
}));

import { setFabVisibility } from "./set-fab-visibility";
import { ActionStatus } from "@/shared/types/server-action";

describe("setFabVisibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns success with isHidden data on valid input", async () => {
		mockToggleFabVisibility.mockResolvedValue({
			success: true,
			isHidden: true,
		});

		const formData = new FormData();
		formData.append("key", "storefront");
		formData.append("isHidden", "true");

		const result = await setFabVisibility(undefined, formData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.data).toEqual({ isHidden: true });
		expect(mockToggleFabVisibility).toHaveBeenCalledWith("storefront", true);
	});

	it("returns validation error on invalid key", async () => {
		const formData = new FormData();
		formData.append("key", "invalid");
		formData.append("isHidden", "true");

		const result = await setFabVisibility(undefined, formData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockToggleFabVisibility).not.toHaveBeenCalled();
	});

	it("returns validation error on missing formData fields", async () => {
		const formData = new FormData();

		const result = await setFabVisibility(undefined, formData);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockToggleFabVisibility).not.toHaveBeenCalled();
	});

	it("returns error when toggleFabVisibility throws", async () => {
		mockToggleFabVisibility.mockRejectedValue(new Error("Cookie write failed"));

		const formData = new FormData();
		formData.append("key", "storefront");
		formData.append("isHidden", "false");

		const result = await setFabVisibility(undefined, formData);

		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
