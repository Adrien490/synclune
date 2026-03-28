import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockConfirmResult } = vi.hoisted(() => ({
	mockConfirmResult: { value: { success: true, message: "Inscription confirmée avec succès !" } },
}));

vi.mock("@/modules/newsletter/services/confirm-newsletter-subscription", () => ({
	confirmNewsletterSubscription: vi.fn(async () => mockConfirmResult.value),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div role="alert" data-variant={variant}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
	}) => (asChild ? <>{children}</> : <button data-variant={variant}>{children}</button>),
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { ConfirmationResult } from "../confirmation-result";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockConfirmResult.value = { success: true, message: "Inscription confirmée avec succès !" };
});

beforeEach(() => {
	mockConfirmResult.value = { success: true, message: "Inscription confirmée avec succès !" };
});

describe("ConfirmationResult", () => {
	// ─── No token ─────────────────────────────────────────────────────────────

	it("renders 'Lien de confirmation manquant' when no token is provided", async () => {
		const Component = await ConfirmationResult({ token: undefined });
		render(Component);
		expect(
			screen.getByRole("heading", { name: /Lien de confirmation manquant/i }),
		).toBeInTheDocument();
	});

	it("shows re-subscribe link when no token", async () => {
		const Component = await ConfirmationResult({ token: undefined });
		render(Component);
		expect(screen.getByRole("link", { name: /Me réinscrire/i })).toBeInTheDocument();
	});

	// ─── Success state ────────────────────────────────────────────────────────

	it("renders 'Inscription confirmée !' heading on success", async () => {
		mockConfirmResult.value = { success: true, message: "Bienvenue !" };
		const Component = await ConfirmationResult({ token: "valid-token" });
		render(Component);
		expect(screen.getByRole("heading", { name: /Inscription confirmée/i })).toBeInTheDocument();
	});

	it("renders success alert on success", async () => {
		mockConfirmResult.value = { success: true, message: "Bienvenue dans la newsletter !" };
		const Component = await ConfirmationResult({ token: "valid-token" });
		render(Component);
		const alert = screen.getByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(alert.getAttribute("data-variant")).not.toBe("destructive");
		expect(document.body.textContent).toContain("Bienvenue dans la newsletter !");
	});

	it("does not show re-subscribe link on success", async () => {
		mockConfirmResult.value = { success: true, message: "Bienvenue !" };
		const Component = await ConfirmationResult({ token: "valid-token" });
		render(Component);
		expect(screen.queryByRole("link", { name: /Me réinscrire/i })).toBeNull();
	});

	// ─── Failure state ────────────────────────────────────────────────────────

	it("renders 'Confirmation impossible' heading on failure", async () => {
		mockConfirmResult.value = { success: false, message: "Token expiré." };
		const Component = await ConfirmationResult({ token: "invalid-token" });
		render(Component);
		expect(screen.getByRole("heading", { name: /Confirmation impossible/i })).toBeInTheDocument();
	});

	it("renders destructive alert on failure", async () => {
		mockConfirmResult.value = { success: false, message: "Token invalide." };
		const Component = await ConfirmationResult({ token: "invalid-token" });
		render(Component);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
		expect(document.body.textContent).toContain("Token invalide.");
	});

	it("shows re-subscribe link on failure", async () => {
		mockConfirmResult.value = { success: false, message: "Erreur." };
		const Component = await ConfirmationResult({ token: "invalid-token" });
		render(Component);
		expect(screen.getByRole("link", { name: /Me réinscrire/i })).toBeInTheDocument();
	});
});
