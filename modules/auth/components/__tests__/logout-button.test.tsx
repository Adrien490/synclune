import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

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

	// ─── aria-busy ────────────────────────────────────────────────────────────

	it("should have aria-busy=true when isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutButton />);

		expect(screen.getByRole("button", { name: "Se déconnecter" })).toHaveAttribute(
			"aria-busy",
			"true",
		);
	});

	it("should not have aria-busy=true when idle", () => {
		render(<LogoutButton />);

		const button = screen.getByRole("button", { name: "Se déconnecter" });
		expect(button.getAttribute("aria-busy")).not.toBe("true");
	});

	// ─── className prop ───────────────────────────────────────────────────────

	it("should apply custom className", () => {
		render(<LogoutButton className="custom-class" />);

		expect(screen.getByRole("button", { name: "Se déconnecter" })).toHaveClass("custom-class");
	});

	// ─── Click interaction ────────────────────────────────────────────────────

	it("should call action when clicked while not pending", () => {
		render(<LogoutButton />);

		fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

		expect(mockLogout.action).toHaveBeenCalledTimes(1);
	});

	it("should not call action when clicked while isPending", () => {
		mockLogout.isPending = true;

		render(<LogoutButton />);

		fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

		expect(mockLogout.action).not.toHaveBeenCalled();
	});

	it("should not call action when clicked while isLoggedOut", () => {
		mockLogout.isLoggedOut = true;

		render(<LogoutButton />);

		fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));

		expect(mockLogout.action).not.toHaveBeenCalled();
	});
});
