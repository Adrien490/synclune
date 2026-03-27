import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockLogout } = vi.hoisted(() => ({
	mockLogout: {
		action: vi.fn(),
		isPending: false,
		isLoggedOut: false,
	},
}));

vi.mock("@/modules/auth/hooks/use-logout", () => ({
	useLogout: () => mockLogout,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

import { LogoutButton } from "../logout-button";

// ============================================================================
// TESTS
// ============================================================================

describe("LogoutButton", () => {
	beforeEach(() => {
		mockLogout.action = vi.fn();
		mockLogout.isPending = false;
		mockLogout.isLoggedOut = false;
	});

	afterEach(cleanup);

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("should render button with aria-label 'Se déconnecter'", () => {
		render(<LogoutButton />);

		expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
	});

	// ─── Children ─────────────────────────────────────────────────────────────

	it("should render children", () => {
		render(<LogoutButton>Quitter</LogoutButton>);

		expect(screen.getByText("Quitter")).toBeInTheDocument();
	});

	// ─── Disabled states ──────────────────────────────────────────────────────

	it("should disable button when isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutButton />);

		expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeDisabled();
	});

	it("should disable button when isLoggedOut", () => {
		mockLogout.isLoggedOut = true;

		render(<LogoutButton />);

		expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeDisabled();
	});
});
