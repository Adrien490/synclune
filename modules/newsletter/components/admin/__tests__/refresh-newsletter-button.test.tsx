import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRefresh, mockIsPending } = vi.hoisted(() => ({
	mockRefresh: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/newsletter/hooks/use-refresh-newsletter", () => ({
	useRefreshNewsletter: vi.fn(() => ({
		refresh: mockRefresh,
		isPending: mockIsPending.value,
	})),
}));

vi.mock("@/shared/components/refresh-button", () => ({
	RefreshButton: ({
		onRefresh,
		isPending,
		label,
		className,
		variant,
	}: {
		onRefresh: () => void;
		isPending: boolean;
		label: string;
		className?: string;
		variant?: string;
	}) => (
		<button
			onClick={onRefresh}
			disabled={isPending}
			aria-label={label}
			className={className}
			data-variant={variant}
		>
			{isPending ? "Chargement..." : label}
		</button>
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { RefreshNewsletterButton } from "../refresh-newsletter-button";

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

describe("RefreshNewsletterButton", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the refresh button", () => {
		render(<RefreshNewsletterButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders with label 'Rafraîchir newsletter'", () => {
		render(<RefreshNewsletterButton />);
		expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Rafraîchir newsletter");
	});

	it("uses outline variant by default", () => {
		render(<RefreshNewsletterButton />);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "outline");
	});

	it("passes custom variant prop", () => {
		render(<RefreshNewsletterButton variant="ghost" />);
		expect(screen.getByRole("button")).toHaveAttribute("data-variant", "ghost");
	});

	it("passes custom className prop", () => {
		render(<RefreshNewsletterButton className="custom-class" />);
		expect(screen.getByRole("button")).toHaveClass("custom-class");
	});

	it("button is enabled when not pending", () => {
		render(<RefreshNewsletterButton />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("disables button when isPending is true", () => {
		mockIsPending.value = true;
		render(<RefreshNewsletterButton />);
		expect(screen.getByRole("button")).toBeDisabled();
	});
});
