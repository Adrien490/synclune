import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/logo-animated", () => ({
	LogoAnimated: () => <div data-testid="logo" />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	ArrowLeft: () => <svg data-testid="arrow-left" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("@/modules/auth/components/auth-fade-in", () => ({
	AuthFadeIn: ({ children }: any) => <div>{children}</div>,
}));

import { AuthPageLayout } from "../auth-page-layout";

// ============================================================================
// TESTS
// ============================================================================

describe("AuthPageLayout", () => {
	afterEach(cleanup);

	// ─── Title ────────────────────────────────────────────────────────────────

	it("should render title as h1", () => {
		render(
			<AuthPageLayout backHref="/" backLabel="Retour" title="Connexion">
				<div>Content</div>
			</AuthPageLayout>,
		);

		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Connexion");
	});

	// ─── Description ─────────────────────────────────────────────────────────

	it("should render description when provided", () => {
		render(
			<AuthPageLayout
				backHref="/"
				backLabel="Retour"
				title="Connexion"
				description="Bienvenue sur Synclune"
			>
				<div>Content</div>
			</AuthPageLayout>,
		);

		expect(screen.getByText("Bienvenue sur Synclune")).toBeInTheDocument();
	});

	it("should not render description when not provided", () => {
		render(
			<AuthPageLayout backHref="/" backLabel="Retour" title="Connexion">
				<div>Content</div>
			</AuthPageLayout>,
		);

		expect(screen.queryByText("Bienvenue sur Synclune")).not.toBeInTheDocument();
	});

	// ─── Back link ────────────────────────────────────────────────────────────

	it("should render back link with correct href and label", () => {
		render(
			<AuthPageLayout backHref="/connexion" backLabel="Se connecter" title="Connexion">
				<div>Content</div>
			</AuthPageLayout>,
		);

		const link = screen.getByRole("link", { name: /Se connecter/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/connexion");
	});

	// ─── Icon ─────────────────────────────────────────────────────────────────

	it("should render icon when provided", () => {
		render(
			<AuthPageLayout
				backHref="/"
				backLabel="Retour"
				title="Connexion"
				icon={<svg data-testid="custom-icon" />}
			>
				<div>Content</div>
			</AuthPageLayout>,
		);

		expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
	});

	// ─── Children ─────────────────────────────────────────────────────────────

	it("should render children", () => {
		render(
			<AuthPageLayout backHref="/" backLabel="Retour" title="Connexion">
				<div data-testid="child-content">Formulaire</div>
			</AuthPageLayout>,
		);

		expect(screen.getByTestId("child-content")).toBeInTheDocument();
		expect(screen.getByText("Formulaire")).toBeInTheDocument();
	});
});
