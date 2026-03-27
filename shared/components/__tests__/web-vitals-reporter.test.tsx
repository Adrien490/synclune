import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockState } = vi.hoisted(() => ({
	mockState: {
		accepted: null as boolean | null,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock("@/shared/lib/posthog", () => ({
	getPostHog: vi.fn(() => null),
}));

vi.mock("web-vitals/attribution", () => ({
	onCLS: vi.fn(),
	onINP: vi.fn(),
	onLCP: vi.fn(),
	onFCP: vi.fn(),
	onTTFB: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { WebVitalsReporter } from "../web-vitals-reporter";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockState.accepted = null;

	// Stub navigator.sendBeacon (not available in jsdom)
	vi.stubGlobal("navigator", {
		...navigator,
		sendBeacon: vi.fn(() => true),
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

// ============================================================================
// TESTS
// ============================================================================

describe("WebVitalsReporter", () => {
	// ─── renders null ─────────────────────────────────────────────────────

	it("returns null (no DOM output)", () => {
		mockState.accepted = true;

		const { container } = render(<WebVitalsReporter />);
		expect(container.innerHTML).toBe("");
	});

	// ─── consent gating ───────────────────────────────────────────────────

	it("does nothing when accepted is false", () => {
		mockState.accepted = false;

		const addSpy = vi.spyOn(document, "addEventListener");
		render(<WebVitalsReporter />);

		const visibilityCall = addSpy.mock.calls.find(([type]) => type === "visibilitychange");
		expect(visibilityCall).toBeUndefined();
	});

	it("does nothing when accepted is null", () => {
		mockState.accepted = null;

		const addSpy = vi.spyOn(document, "addEventListener");
		render(<WebVitalsReporter />);

		const visibilityCall = addSpy.mock.calls.find(([type]) => type === "visibilitychange");
		expect(visibilityCall).toBeUndefined();
	});

	// ─── visibilitychange listener ────────────────────────────────────────

	it("registers visibilitychange listener when accepted is true", () => {
		mockState.accepted = true;

		const addSpy = vi.spyOn(document, "addEventListener");
		render(<WebVitalsReporter />);

		const visibilityCall = addSpy.mock.calls.find(([type]) => type === "visibilitychange");
		expect(visibilityCall).toBeDefined();
	});

	it("removes visibilitychange listener on unmount", () => {
		mockState.accepted = true;

		const removeSpy = vi.spyOn(document, "removeEventListener");
		const { unmount } = render(<WebVitalsReporter />);

		unmount();

		const removedVisibility = removeSpy.mock.calls.find(([type]) => type === "visibilitychange");
		expect(removedVisibility).toBeDefined();
	});
});
