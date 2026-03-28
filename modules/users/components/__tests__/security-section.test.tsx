import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsPending } = vi.hoisted(() => ({
	mockIsPending: { value: false },
}));

vi.mock("@/modules/auth/hooks/use-resend-verification-email", () => ({
	useResendVerificationEmail: vi.fn(() => ({
		action: vi.fn(),
		isPending: mockIsPending.value,
	})),
}));

vi.mock("@/shared/constants/storage-keys", () => ({
	getResendVerificationCooldownKey: (email: string) => `resend-cooldown-${email}`,
}));

// localStorage mock for ResendVerificationButton
const localStorageMock = {
	getItem: vi.fn(() => null),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
Object.defineProperty(global, "localStorage", {
	value: localStorageMock,
	writable: true,
});

vi.mock("@/modules/auth/hooks/use-change-password", () => ({
	useChangePassword: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
		state: undefined,
	})),
}));

vi.mock("@/shared/components/forms", () => ({
	useAppForm: vi.fn(() => ({
		AppField: ({ children }: { name: string; children: (f: unknown) => React.ReactNode }) =>
			children({
				InputField: ({ label }: { label: string }) => <input aria-label={label} />,
			}),
		Subscribe: ({ children }: { children: (v: unknown[]) => React.ReactNode }) => children([true]),
		handleSubmit: vi.fn(),
	})),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open: boolean;
		onOpenChange: (v: boolean) => void;
	}) => (open ? <div data-testid="responsive-dialog">{children}</div> : null),
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		variant,
		size,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		variant?: string;
		size?: string;
	}) => (
		<button disabled={disabled} onClick={onClick} data-variant={variant} data-size={size}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ id }: { id?: string }) => <input type="checkbox" id={id} />,
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({ children }: { children: React.ReactNode }) => <div role="alert">{children}</div>,
	AlertDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("lucide-react", () => ({
	Lock: () => <svg data-testid="icon-lock" />,
	CircleCheck: () => <svg data-testid="icon-circle-check" />,
	CircleAlert: () => <svg data-testid="icon-circle-alert" />,
	Mail: () => <svg data-testid="icon-mail" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { SecuritySection } from "../security-section";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
});

beforeEach(() => {
	mockIsPending.value = false;
});

describe("SecuritySection", () => {
	// ─── Heading ──────────────────────────────────────────────────────────────

	it("renders 'Sécurité' heading", () => {
		render(
			<SecuritySection emailVerified={true} providers={["credential"]} email="user@example.com" />,
		);
		expect(screen.getByRole("heading", { name: /Sécurité/i })).toBeInTheDocument();
	});

	it("has aria-labelledby pointing to the heading", () => {
		render(
			<SecuritySection emailVerified={true} providers={["credential"]} email="user@example.com" />,
		);
		const section = document.querySelector("section[aria-labelledby='security-heading']");
		expect(section).not.toBeNull();
	});

	// ─── Credential provider ──────────────────────────────────────────────────

	it("shows 'Modifier' button when credential provider is present", () => {
		render(
			<SecuritySection emailVerified={true} providers={["credential"]} email="user@example.com" />,
		);
		expect(screen.getByRole("button", { name: /Modifier/i })).toBeInTheDocument();
	});

	it("does not show 'Modifier' button when no credential provider", () => {
		render(
			<SecuritySection emailVerified={true} providers={["google"]} email="user@example.com" />,
		);
		expect(screen.queryByRole("button", { name: /Modifier/i })).toBeNull();
	});

	// ─── Email verified state ─────────────────────────────────────────────────

	it("shows 'Email vérifiée' when emailVerified is true", () => {
		render(
			<SecuritySection emailVerified={true} providers={["credential"]} email="user@example.com" />,
		);
		expect(document.body.textContent).toContain("Email vérifiée");
	});

	it("shows verification warning when emailVerified is false", () => {
		render(
			<SecuritySection emailVerified={false} providers={["credential"]} email="user@example.com" />,
		);
		expect(document.body.textContent).toContain("Vérification de l");
	});

	it("renders ResendVerificationButton when email not verified", () => {
		render(
			<SecuritySection emailVerified={false} providers={["credential"]} email="user@example.com" />,
		);
		// ResendVerificationButton renders a button with "Renvoyer"
		expect(document.body.textContent).toContain("Renvoyer");
	});

	// ─── OAuth providers ──────────────────────────────────────────────────────

	it("shows Google badge when google provider is present", () => {
		render(
			<SecuritySection emailVerified={true} providers={["google"]} email="user@example.com" />,
		);
		expect(screen.getByText("Google")).toBeInTheDocument();
	});

	it("shows GitHub badge when github provider is present", () => {
		render(
			<SecuritySection emailVerified={true} providers={["github"]} email="user@example.com" />,
		);
		expect(screen.getByText("GitHub")).toBeInTheDocument();
	});

	it("does not show 'Comptes connectés' section when no oauth providers", () => {
		render(
			<SecuritySection emailVerified={true} providers={["credential"]} email="user@example.com" />,
		);
		expect(screen.queryByText("Comptes connectés")).toBeNull();
	});

	it("shows both credential and oauth sections when both present", () => {
		render(
			<SecuritySection
				emailVerified={true}
				providers={["credential", "google"]}
				email="user@example.com"
			/>,
		);
		expect(screen.getByRole("button", { name: /Modifier/i })).toBeInTheDocument();
		expect(screen.getByText("Google")).toBeInTheDocument();
	});

	it("uses provider value as label when PROVIDER_LABELS does not have the key", () => {
		render(
			<SecuritySection emailVerified={true} providers={["custom-oidc"]} email="user@example.com" />,
		);
		expect(screen.getByText("custom-oidc")).toBeInTheDocument();
	});
});
