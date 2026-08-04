import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockResetConsent, mockAnnounce, mockTriggerHaptic } = vi.hoisted(() => ({
	mockResetConsent: vi.fn(),
	mockAnnounce: vi.fn(),
	mockTriggerHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (state: { resetConsent: () => void }) => unknown) =>
		selector({ resetConsent: mockResetConsent }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockTriggerHaptic,
}));

vi.mock("@/shared/utils/announce", () => ({
	announce: mockAnnounce,
}));

// Import AFTER mocks
import { ManageCookiesButton } from "../manage-cookies-button";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("ManageCookiesButton", () => {
	it("resets consent on click", () => {
		render(<ManageCookiesButton />);

		fireEvent.click(screen.getByRole("button", { name: "Modifier mes préférences cookies" }));
		expect(mockResetConsent).toHaveBeenCalledOnce();
	});

	it("announces the banner reappearance to screen readers", () => {
		// La bannière remonte AVEC son contenu (AnimatePresence) : elle ne peut pas
		// s'auto-annoncer via aria-live — l'annonce impérative vit donc ici.
		render(<ManageCookiesButton />);

		fireEvent.click(screen.getByRole("button", { name: "Modifier mes préférences cookies" }));
		expect(mockAnnounce).toHaveBeenCalledOnce();
		expect(mockAnnounce.mock.calls[0]?.[0]).toMatch(/bannière de cookies/i);
	});
});
