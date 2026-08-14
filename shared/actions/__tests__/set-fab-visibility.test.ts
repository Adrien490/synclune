import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCookieStore, mockEnforceRateLimit } = vi.hoisted(() => ({
	mockCookieStore: {
		set: vi.fn(),
		delete: vi.fn(),
	},
	mockEnforceRateLimit: vi.fn(),
}));

vi.mock("next/headers", () => ({
	cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

import { setFabVisibility } from "../set-fab-visibility";
import { ActionStatus } from "@/shared/types/server-action";

const formDataOf = (fields: Record<string, string>) => {
	const formData = new FormData();
	Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
	return formData;
};

describe("setFabVisibility", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEnforceRateLimit.mockResolvedValue({ success: true });
	});

	// Action publique non authentifiée : sans ce plafond, c'est une écriture de cookie
	// illimitée par RPC. Audit rate limiting 2026-07-31.
	describe("rate limiting", () => {
		it("bloque avant toute écriture de cookie quand le quota est épuisé", async () => {
			mockEnforceRateLimit.mockResolvedValue({
				error: { status: ActionStatus.ERROR, message: "Trop de requêtes." },
			});

			const result = await setFabVisibility(
				undefined,
				formDataOf({ key: "admin-dashboard", isHidden: "true" }),
			);

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(mockCookieStore.set).not.toHaveBeenCalled();
			expect(mockCookieStore.delete).not.toHaveBeenCalled();
		});
	});

	describe("validation", () => {
		it("returns validation error on invalid key", async () => {
			const result = await setFabVisibility(
				undefined,
				formDataOf({ key: "invalid", isHidden: "true" }),
			);

			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(mockCookieStore.set).not.toHaveBeenCalled();
			expect(mockCookieStore.delete).not.toHaveBeenCalled();
		});

		it("returns validation error on missing formData fields", async () => {
			const result = await setFabVisibility(undefined, new FormData());

			expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
			expect(mockCookieStore.set).not.toHaveBeenCalled();
			expect(mockCookieStore.delete).not.toHaveBeenCalled();
		});

		// Le nom du cookie est dérivé de `key` : une clé non validée le piloterait.
		it("never writes a cookie whose name is derived from an unvalidated key", async () => {
			await setFabVisibility(undefined, formDataOf({ key: "../../evil", isHidden: "true" }));

			expect(mockCookieStore.set).not.toHaveBeenCalled();
		});
	});

	describe("cookie write", () => {
		it("sets cookie when hiding a FAB", async () => {
			const result = await setFabVisibility(
				undefined,
				formDataOf({ key: "admin-dashboard", isHidden: "true" }),
			);

			expect(mockCookieStore.set).toHaveBeenCalledWith(
				"fab-hidden-admin-dashboard",
				"true",
				expect.objectContaining({
					path: "/",
					httpOnly: true,
					sameSite: "strict",
				}),
			);
			expect(mockCookieStore.delete).not.toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.data).toEqual({ isHidden: true });
		});

		it("deletes cookie when showing a FAB", async () => {
			const result = await setFabVisibility(
				undefined,
				formDataOf({ key: "admin-dashboard", isHidden: "false" }),
			);

			expect(mockCookieStore.delete).toHaveBeenCalledWith("fab-hidden-admin-dashboard");
			expect(mockCookieStore.set).not.toHaveBeenCalled();
			expect(result.status).toBe(ActionStatus.SUCCESS);
			expect(result.data).toEqual({ isHidden: false });
		});

		it("sets secure:false in test environment", async () => {
			await setFabVisibility(undefined, formDataOf({ key: "admin-dashboard", isHidden: "true" }));

			expect(mockCookieStore.set).toHaveBeenCalledWith(
				"fab-hidden-admin-dashboard",
				"true",
				expect.objectContaining({ secure: false }),
			);
		});
	});

	it("returns an error when the cookie write throws", async () => {
		mockCookieStore.set.mockImplementationOnce(() => {
			throw new Error("Cookie write failed");
		});

		const result = await setFabVisibility(
			undefined,
			formDataOf({ key: "admin-dashboard", isHidden: "true" }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
