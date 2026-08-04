import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/components/logout-alert-dialog", () => ({
	LogoutAlertDialog: ({ children }: any) => <div data-testid="logout-dialog">{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children }: any) => <button>{children}</button>,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	SignOutIcon: () => <svg />,
}));

import { LogoutCard } from "../logout-card";

// ============================================================================
// TESTS
// ============================================================================

describe("LogoutCard", () => {
	afterEach(cleanup);

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("should render heading 'Déconnexion'", () => {
		render(<LogoutCard />);

		expect(screen.getByRole("heading", { name: "Déconnexion" })).toBeInTheDocument();
	});

	it("should render LogoutAlertDialog", () => {
		render(<LogoutCard />);

		expect(screen.getByTestId("logout-dialog")).toBeInTheDocument();
	});

	it("should show 'Se déconnecter' button text", () => {
		render(<LogoutCard />);

		expect(screen.getByRole("button", { name: /Se déconnecter/i })).toBeInTheDocument();
	});

	// ─── Accessibility ────────────────────────────────────────────────────────

	it("should render a <section> landmark element", () => {
		render(<LogoutCard />);

		expect(document.querySelector("section")).not.toBeNull();
	});

	it("heading id should match section aria-labelledby", () => {
		render(<LogoutCard />);

		const section = document.querySelector("section");
		const heading = screen.getByRole("heading", { name: "Déconnexion" });

		expect(section?.getAttribute("aria-labelledby")).toBe(heading.id);
	});
});
