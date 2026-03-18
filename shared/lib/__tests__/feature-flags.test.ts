import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const { mockIsFeatureEnabled, mockGetFeatureFlagPayload, mockGetPostHog } = vi.hoisted(() => {
	const mockIsFeatureEnabled = vi.fn();
	const mockGetFeatureFlagPayload = vi.fn();
	const mockGetPostHog = vi.fn(() => ({
		isFeatureEnabled: mockIsFeatureEnabled,
		getFeatureFlagPayload: mockGetFeatureFlagPayload,
	}));
	return { mockIsFeatureEnabled, mockGetFeatureFlagPayload, mockGetPostHog };
});

vi.mock("@/shared/lib/posthog", () => ({
	getPostHog: mockGetPostHog,
}));

// ============================================================================
// TESTS
// ============================================================================

import { isFeatureEnabled, getFeatureFlagPayload } from "../feature-flags";

describe("feature-flags", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetPostHog.mockReturnValue({
			isFeatureEnabled: mockIsFeatureEnabled,
			getFeatureFlagPayload: mockGetFeatureFlagPayload,
		});
	});

	// --------------------------------------------------------------------------
	// isFeatureEnabled
	// --------------------------------------------------------------------------

	describe("isFeatureEnabled", () => {
		it("returns false on the server (typeof window === undefined)", () => {
			// Simulate SSR: temporarily remove window from the global scope
			const originalWindow = globalThis.window;
			// @ts-expect-error - intentionally deleting window to simulate SSR
			delete globalThis.window;

			try {
				const result = isFeatureEnabled("my-flag");
				expect(result).toBe(false);
			} finally {
				globalThis.window = originalWindow;
			}

			// PostHog should never have been consulted
			expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
		});

		it("delegates to PostHog and returns true when flag is enabled", () => {
			mockIsFeatureEnabled.mockReturnValue(true);

			const result = isFeatureEnabled("my-flag");

			expect(mockIsFeatureEnabled).toHaveBeenCalledOnce();
			expect(mockIsFeatureEnabled).toHaveBeenCalledWith("my-flag");
			expect(result).toBe(true);
		});

		it("delegates to PostHog and returns false when flag is disabled", () => {
			mockIsFeatureEnabled.mockReturnValue(false);

			const result = isFeatureEnabled("my-flag");

			expect(mockIsFeatureEnabled).toHaveBeenCalledWith("my-flag");
			expect(result).toBe(false);
		});

		it("falls back to false when PostHog returns null (not initialized)", () => {
			mockGetPostHog.mockReturnValue(null as never);

			const result = isFeatureEnabled("my-flag");

			expect(result).toBe(false);
			expect(mockIsFeatureEnabled).not.toHaveBeenCalled();
		});

		it("falls back to false when PostHog isFeatureEnabled returns undefined", () => {
			mockIsFeatureEnabled.mockReturnValue(undefined);

			const result = isFeatureEnabled("my-flag");

			expect(result).toBe(false);
		});

		it("passes the exact flag key through to PostHog", () => {
			mockIsFeatureEnabled.mockReturnValue(true);

			isFeatureEnabled("new-checkout-flow");

			expect(mockIsFeatureEnabled).toHaveBeenCalledWith("new-checkout-flow");
		});
	});

	// --------------------------------------------------------------------------
	// getFeatureFlagPayload
	// --------------------------------------------------------------------------

	describe("getFeatureFlagPayload", () => {
		it("returns undefined on the server (typeof window === undefined)", () => {
			const originalWindow = globalThis.window;
			// @ts-expect-error - intentionally deleting window to simulate SSR
			delete globalThis.window;

			try {
				const result = getFeatureFlagPayload("my-flag");
				expect(result).toBeUndefined();
			} finally {
				globalThis.window = originalWindow;
			}

			expect(mockGetFeatureFlagPayload).not.toHaveBeenCalled();
		});

		it("delegates to PostHog and returns the payload", () => {
			const payload = { variant: "blue", discount: 10 };
			mockGetFeatureFlagPayload.mockReturnValue(payload);

			const result = getFeatureFlagPayload("multivariate-flag");

			expect(mockGetFeatureFlagPayload).toHaveBeenCalledOnce();
			expect(mockGetFeatureFlagPayload).toHaveBeenCalledWith("multivariate-flag");
			expect(result).toEqual(payload);
		});

		it("returns a string payload", () => {
			mockGetFeatureFlagPayload.mockReturnValue("control");

			const result = getFeatureFlagPayload("ab-test");

			expect(result).toBe("control");
		});

		it("returns a numeric payload", () => {
			mockGetFeatureFlagPayload.mockReturnValue(42);

			const result = getFeatureFlagPayload("numeric-flag");

			expect(result).toBe(42);
		});

		it("returns undefined when PostHog returns undefined for an unknown flag", () => {
			mockGetFeatureFlagPayload.mockReturnValue(undefined);

			const result = getFeatureFlagPayload("unknown-flag");

			expect(result).toBeUndefined();
		});

		it("falls back to undefined when PostHog is null (not initialized)", () => {
			mockGetPostHog.mockReturnValue(null as never);

			const result = getFeatureFlagPayload("my-flag");

			expect(result).toBeUndefined();
			expect(mockGetFeatureFlagPayload).not.toHaveBeenCalled();
		});

		it("passes the exact flag key through to PostHog", () => {
			mockGetFeatureFlagPayload.mockReturnValue(null);

			getFeatureFlagPayload("show-reviews");

			expect(mockGetFeatureFlagPayload).toHaveBeenCalledWith("show-reviews");
		});
	});
});
