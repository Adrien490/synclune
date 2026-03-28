import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/creations/bague",
	useSearchParams: () => ({
		get: () => "4",
		toString: () => "ratingFilter=4",
	}),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		variant,
		size,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
		size?: string;
	}) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
			{children}
		</button>
	),
}));

import { ReviewFilterResetButton } from "../review-filter-reset-button";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewFilterResetButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the button with label 'Voir tous les avis'", () => {
		render(<ReviewFilterResetButton />);
		expect(screen.getByText("Voir tous les avis")).toBeInTheDocument();
	});

	it("renders a button element", () => {
		render(<ReviewFilterResetButton />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders the button enabled by default", () => {
		render(<ReviewFilterResetButton />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});
});
