import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUnsubscribeResult } = vi.hoisted(() => ({
	mockUnsubscribeResult: {
		value: { success: true, message: "Vous avez bien été désinscrit(e)." },
	},
}));

vi.mock("@/modules/newsletter/services/unsubscribe-newsletter", () => ({
	unsubscribeNewsletter: vi.fn(async () => mockUnsubscribeResult.value),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<div role="alert" data-variant={variant}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { UnsubscribeResult } from "../unsubscribe-result";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockUnsubscribeResult.value = { success: true, message: "Vous avez bien été désinscrit(e)." };
});

beforeEach(() => {
	mockUnsubscribeResult.value = { success: true, message: "Vous avez bien été désinscrit(e)." };
});

describe("UnsubscribeResult", () => {
	// ─── No token ─────────────────────────────────────────────────────────────

	it("renders 'Lien de désinscription manquant' when no token is provided", async () => {
		const Component = await UnsubscribeResult({ token: undefined });
		render(Component);
		expect(
			screen.getByRole("heading", { name: /Lien de désinscription manquant/i }),
		).toBeInTheDocument();
	});

	it("shows contact instructions when no token", async () => {
		const Component = await UnsubscribeResult({ token: undefined });
		render(Component);
		expect(document.body.textContent).toContain("contactez-nous");
	});

	it("does not render an alert when no token", async () => {
		const Component = await UnsubscribeResult({ token: undefined });
		render(Component);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	// ─── Success state ────────────────────────────────────────────────────────

	it("renders 'Désinscription confirmée' heading on success", async () => {
		mockUnsubscribeResult.value = { success: true, message: "Bonne continuation !" };
		const Component = await UnsubscribeResult({ token: "valid-token" });
		render(Component);
		expect(screen.getByRole("heading", { name: /Désinscription confirmée/i })).toBeInTheDocument();
	});

	it("renders success alert on success", async () => {
		mockUnsubscribeResult.value = { success: true, message: "Bonne continuation !" };
		const Component = await UnsubscribeResult({ token: "valid-token" });
		render(Component);
		const alert = screen.getByRole("alert");
		expect(alert).toBeInTheDocument();
		expect(alert.getAttribute("data-variant")).not.toBe("destructive");
		expect(document.body.textContent).toContain("Bonne continuation !");
	});

	// ─── Failure state ────────────────────────────────────────────────────────

	it("renders 'Désinscription impossible' heading on failure", async () => {
		mockUnsubscribeResult.value = { success: false, message: "Token invalide." };
		const Component = await UnsubscribeResult({ token: "invalid-token" });
		render(Component);
		expect(screen.getByRole("heading", { name: /Désinscription impossible/i })).toBeInTheDocument();
	});

	it("renders destructive alert on failure", async () => {
		mockUnsubscribeResult.value = { success: false, message: "Token expiré." };
		const Component = await UnsubscribeResult({ token: "invalid-token" });
		render(Component);
		const alert = screen.getByRole("alert");
		expect(alert).toHaveAttribute("data-variant", "destructive");
		expect(document.body.textContent).toContain("Token expiré.");
	});
});
