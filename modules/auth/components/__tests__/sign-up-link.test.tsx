import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("next/link", () => ({
	default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

import { SignUpLink } from "../sign-up-link";

// ============================================================================
// TESTS
// ============================================================================

describe("SignUpLink", () => {
	afterEach(cleanup);

	// ─── Text ─────────────────────────────────────────────────────────────────

	it("should render 'Première visite ?' text", () => {
		render(<SignUpLink />);

		expect(screen.getByText(/Première visite/)).toBeInTheDocument();
	});

	// ─── Link href ────────────────────────────────────────────────────────────

	it("should show link to /inscription when no callbackURL", () => {
		render(<SignUpLink />);

		const link = screen.getByRole("link", { name: "Créez votre compte" });
		expect(link).toHaveAttribute("href", "/inscription");
	});

	it("should show link with encoded callbackURL when provided", () => {
		render(<SignUpLink callbackURL="/boutique/produits" />);

		const link = screen.getByRole("link", { name: "Créez votre compte" });
		expect(link).toHaveAttribute(
			"href",
			`/inscription?callbackURL=${encodeURIComponent("/boutique/produits")}`,
		);
	});
});
