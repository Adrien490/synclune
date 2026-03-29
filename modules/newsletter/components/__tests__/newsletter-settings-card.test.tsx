import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/newsletter/actions/toggle-newsletter", () => ({
	toggleNewsletter: vi.fn(),
}));

vi.mock("@/shared/hooks/use-action-with-toast", () => ({
	useActionWithToast: vi.fn(() => ({
		action: mockAction,
		isPending: mockIsPending.value,
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		type,
		variant,
		className,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		type?: string;
		variant?: string;
		className?: string;
	}) => (
		<button
			disabled={disabled}
			type={type as "button" | "submit" | "reset" | undefined}
			data-variant={variant}
			className={className}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Bell: () => <svg data-testid="icon-bell" />,
	BellOff: () => <svg data-testid="icon-bell-off" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { NewsletterSettingsCard } from "../newsletter-settings-card";

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

describe("NewsletterSettingsCard", () => {
	// ─── Heading ──────────────────────────────────────────────────────────────

	it("renders 'Newsletter' heading", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(screen.getByRole("heading", { name: /Newsletter/i })).toBeInTheDocument();
	});

	it("has aria-labelledby pointing to newsletter-heading", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		const section = document.querySelector("section[aria-labelledby='newsletter-heading']");
		expect(section).not.toBeNull();
	});

	// ─── Subscribed state ─────────────────────────────────────────────────────

	it("shows 'Inscrit(e)' status indicator when subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={true} />);
		expect(document.body.textContent).toContain("Inscrit(e)");
	});

	it("shows green dot when subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={true} />);
		const greenDot = document.querySelector(".bg-green-500");
		expect(greenDot).not.toBeNull();
	});

	it("shows BellOff icon when subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={true} />);
		expect(screen.getByTestId("icon-bell-off")).toBeInTheDocument();
	});

	it("shows 'Se désinscrire' button when subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={true} />);
		expect(screen.getByRole("button").textContent).toContain("désinscrire");
	});

	it("sets action value to 'unsubscribe' when subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={true} />);
		const input = document.querySelector('input[name="action"]') as HTMLInputElement;
		expect(input.value).toBe("unsubscribe");
	});

	// ─── Unsubscribed state ───────────────────────────────────────────────────

	it("shows 'Non inscrit(e)' status indicator when not subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(document.body.textContent).toContain("Non inscrit(e)");
	});

	it("shows gray dot when not subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		const grayDot = document.querySelector(".bg-gray-400");
		expect(grayDot).not.toBeNull();
	});

	it("shows Bell icon when not subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(screen.getByTestId("icon-bell")).toBeInTheDocument();
	});

	it("shows 'S'inscrire' button when not subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(screen.getByRole("button").textContent).toContain("inscrire");
	});

	it("sets action value to 'subscribe' when not subscribed", () => {
		render(<NewsletterSettingsCard isSubscribed={false} />);
		const input = document.querySelector('input[name="action"]') as HTMLInputElement;
		expect(input.value).toBe("subscribe");
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows loader icon when pending", () => {
		mockIsPending.value = true;
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});

	it("shows 'Traitement...' text when pending", () => {
		mockIsPending.value = true;
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(screen.getByRole("button").textContent).toContain("Traitement...");
	});

	it("disables submit button when pending", () => {
		mockIsPending.value = true;
		render(<NewsletterSettingsCard isSubscribed={false} />);
		expect(screen.getByRole("button")).toBeDisabled();
	});
});
