import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockState } = vi.hoisted(() => ({
	mockState: {
		accepted: null as boolean | null,
		_hasHydrated: false,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock("@vercel/analytics/next", () => ({
	Analytics: () => <div data-testid="vercel-analytics" />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { ConditionalAnalytics } from "../conditional-analytics";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockState.accepted = null;
	mockState._hasHydrated = false;
	delete process.env.NEXT_PUBLIC_VERCEL_ENV;
});

afterEach(() => {
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("ConditionalAnalytics", () => {
	// ─── Returns null conditions ───────────────────────────────────────────

	it("returns null when not hydrated", () => {
		mockState._hasHydrated = false;
		mockState.accepted = true;
		process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

		const { container } = render(<ConditionalAnalytics />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when accepted is false", () => {
		mockState._hasHydrated = true;
		mockState.accepted = false;
		process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

		const { container } = render(<ConditionalAnalytics />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when accepted is null", () => {
		mockState._hasHydrated = true;
		mockState.accepted = null;
		process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

		const { container } = render(<ConditionalAnalytics />);
		expect(container.innerHTML).toBe("");
	});

	it("returns null when NEXT_PUBLIC_VERCEL_ENV is undefined", () => {
		mockState._hasHydrated = true;
		mockState.accepted = true;
		// process.env.NEXT_PUBLIC_VERCEL_ENV already deleted in beforeEach

		const { container } = render(<ConditionalAnalytics />);
		expect(container.innerHTML).toBe("");
	});

	// ─── Renders analytics ────────────────────────────────────────────────

	it("renders Analytics when all conditions are met", () => {
		mockState._hasHydrated = true;
		mockState.accepted = true;
		process.env.NEXT_PUBLIC_VERCEL_ENV = "production";

		const { getByTestId } = render(<ConditionalAnalytics />);
		expect(getByTestId("vercel-analytics")).toBeInTheDocument();
	});
});
