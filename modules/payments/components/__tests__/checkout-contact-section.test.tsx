import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockLogout = vi.fn();
vi.mock("@/modules/auth/actions/logout", () => ({
	logout: () => mockLogout(),
}));

vi.mock("@/modules/payments/components/checkout-section", () => ({
	CheckoutSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
		<section>
			<h2>{title}</h2>
			{children}
		</section>
	),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	EnvelopeIcon: ({ className }: { className?: string }) => (
		<svg data-testid="icon-mail" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutContactSection } from "../checkout-contact-section";

// ============================================================================
// HELPERS
// ============================================================================

function createMockForm(overrides: Record<string, unknown> = {}) {
	return {
		AppField: ({
			children,
		}: {
			name: string;
			children: (field: {
				InputField: (props: Record<string, unknown>) => React.ReactNode;
			}) => React.ReactNode;
			validators?: unknown;
		}) =>
			children({
				InputField: (props: Record<string, unknown>) => (
					<input
						type={(props.type as string) || "text"}
						aria-label={(props.label as string) || ""}
						required={props.required as boolean}
						data-testid={`input-${props.label}`}
					/>
				),
			}),
		Subscribe: ({
			children,
		}: {
			selector?: (s: unknown) => unknown;
			children: (v: unknown) => React.ReactNode;
		}) => children({}),
		...overrides,
	} as unknown as Parameters<typeof CheckoutContactSection>[0]["form"];
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("CheckoutContactSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Section structure ────────────────────────────────────────────────────

	it("renders 'Contact' heading", () => {
		render(<CheckoutContactSection form={createMockForm()} />);
		expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
	});

	// ─── Guest user ───────────────────────────────────────────────────────────

	it("renders email field for guest user", () => {
		render(<CheckoutContactSection form={createMockForm()} />);
		expect(screen.getByTestId("input-Adresse email")).toBeInTheDocument();
	});

	it("ne rend AUCUN lien de connexion pour un invité (connexion admin-only depuis 2026-07-31)", () => {
		// « Tu as déjà un compte ? Connecte-toi » envoyait 100 % des clients vers
		// /connexion, réservée à l'administration — une impasse avec promesse fausse
		// (aucun compte client, le suivi passe par le lien tokenisé de l'email).
		render(<CheckoutContactSection form={createMockForm()} />);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByText(/Tu as déjà un compte/)).not.toBeInTheDocument();
	});
});
