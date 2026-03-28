import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/modules/payments/components/checkout-section", () => ({
	CheckoutSection: ({ title, children }: { title: string; children: React.ReactNode }) => (
		<section>
			<h2>{title}</h2>
			{children}
		</section>
	),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	Info: ({ className }: { className?: string }) => (
		<svg data-testid="icon-info" className={className} />
	),
	Mail: ({ className }: { className?: string }) => (
		<svg data-testid="icon-mail" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutContactSection } from "../checkout-contact-section";
import type { Session } from "@/modules/auth/lib/auth";

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

function createSession(email = "user@example.com"): Session {
	return {
		user: {
			id: "u-1",
			email,
			name: "Utilisateur Test",
		},
	} as unknown as Session;
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
		render(<CheckoutContactSection form={createMockForm()} session={null} />);
		expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
	});

	// ─── Guest user ───────────────────────────────────────────────────────────

	it("renders email field for guest user", () => {
		render(<CheckoutContactSection form={createMockForm()} session={null} />);
		expect(screen.getByTestId("input-Adresse email")).toBeInTheDocument();
	});

	it("renders login link for guest user", () => {
		render(<CheckoutContactSection form={createMockForm()} session={null} />);
		expect(screen.getByRole("link", { name: "Connectez-vous" })).toBeInTheDocument();
	});

	it("login link points to /connexion with callback", () => {
		render(<CheckoutContactSection form={createMockForm()} session={null} />);
		const link = screen.getByRole("link", { name: "Connectez-vous" });
		expect(link).toHaveAttribute("href", "/connexion?callbackURL=/paiement");
	});

	// ─── Logged-in user ───────────────────────────────────────────────────────

	it("does not render email input for logged-in user", () => {
		render(<CheckoutContactSection form={createMockForm()} session={createSession()} />);
		expect(screen.queryByTestId("input-Adresse email")).not.toBeInTheDocument();
	});

	it("shows user email for logged-in user", () => {
		render(
			<CheckoutContactSection
				form={createMockForm()}
				session={createSession("alice@example.com")}
			/>,
		);
		expect(screen.getByText("alice@example.com")).toBeInTheDocument();
	});

	it("shows mail icon for logged-in user", () => {
		render(<CheckoutContactSection form={createMockForm()} session={createSession()} />);
		expect(screen.getByTestId("icon-mail")).toBeInTheDocument();
	});

	it("does not render login link for logged-in user", () => {
		render(<CheckoutContactSection form={createMockForm()} session={createSession()} />);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
