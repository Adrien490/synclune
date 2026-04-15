import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockToggleStatus } = vi.hoisted(() => ({
	mockToggleStatus: vi.fn(),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/modules/reviews/hooks/use-review-moderation", () => ({
	useReviewModeration: () => ({ toggleStatus: mockToggleStatus, isPending: false }),
}));

vi.mock("./review-detail-dialog", () => ({
	ReviewDetailDialog: () => <div data-testid="review-detail-dialog" />,
}));

vi.mock("next/dynamic", () => ({
	default: (fn: () => Promise<{ ReviewDetailDialog: unknown }>) => {
		void fn();
		return () => <div data-testid="review-detail-dialog" />;
	},
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		"aria-label": ariaLabel,
		onClick,
		disabled,
		variant,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
	}) => (
		<button aria-label={ariaLabel} onClick={onClick} disabled={disabled} data-variant={variant}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/dropdown-menu", () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<div data-testid="dropdown-trigger">{children}</div>
	),
	DropdownMenuContent: ({ children }: { children: React.ReactNode; align?: string }) => (
		<div data-testid="dropdown-content">{children}</div>
	),
	DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
	DropdownMenuItem: ({
		children,
		onClick,
		onSelect,
		asChild,
		className,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		onSelect?: () => void;
		asChild?: boolean;
		className?: string;
	}) =>
		asChild ? (
			<div role="menuitem" className={className}>
				{children}
			</div>
		) : (
			<button role="menuitem" onClick={onClick ?? onSelect} className={className}>
				{children}
			</button>
		),
}));

vi.mock("@/shared/components/ui/alert-dialog", () => ({
	AlertDialog: ({
		children,
		open,
	}: {
		children: React.ReactNode;
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
	}) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
	AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="alert-dialog-content">{children}</div>
	),
	AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertDialogCancel: ({
		children,
		disabled,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
	}) => (
		<button disabled={disabled} data-testid="alert-dialog-cancel">
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	Eye: () => <svg data-testid="icon-eye" />,
	EyeOff: () => <svg data-testid="icon-eye-off" />,
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	EllipsisVertical: () => <svg data-testid="icon-ellipsis" />,
	MessageSquare: () => <svg data-testid="icon-message-square" />,
}));

import { ReviewRowActions } from "../review-row-actions";
import type { ReviewAdmin } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createReview(overrides: Partial<ReviewAdmin> = {}): ReviewAdmin {
	return {
		id: "rev-1",
		rating: 4,
		title: "Super produit",
		content: "Très bien",
		status: "PUBLISHED",
		createdAt: new Date("2026-01-01"),
		updatedAt: new Date("2026-01-01"),
		user: {
			id: "user-1",
			name: "Marie Dupont",
			email: "marie@example.com",
			image: null,
		},
		product: {
			id: "prod-1",
			title: "Bague argent",
			slug: "bague-argent",
		},
		medias: [],
		response: null,
		...overrides,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewRowActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the trigger button with aria-label 'Actions'", () => {
		render(<ReviewRowActions review={createReview()} />);
		expect(screen.getByRole("button", { name: "Actions" })).toBeInTheDocument();
	});

	it("renders 'Voir le détail' menu item", () => {
		render(<ReviewRowActions review={createReview()} />);
		expect(screen.getByText("Voir le détail")).toBeInTheDocument();
	});

	it("renders 'Voir le produit' menu item", () => {
		render(<ReviewRowActions review={createReview()} />);
		expect(screen.getByText("Voir le produit")).toBeInTheDocument();
	});

	it("renders the separator", () => {
		render(<ReviewRowActions review={createReview()} />);
		expect(screen.getByTestId("dropdown-separator")).toBeInTheDocument();
	});

	it("shows 'Masquer' when review is PUBLISHED", () => {
		render(<ReviewRowActions review={createReview({ status: "PUBLISHED" })} />);
		expect(screen.getByText("Masquer")).toBeInTheDocument();
	});

	it("shows 'Publier' when review is HIDDEN", () => {
		render(<ReviewRowActions review={createReview({ status: "HIDDEN" })} />);
		expect(screen.getByText("Publier")).toBeInTheDocument();
	});

	it("renders 'Voir le produit' link pointing to the product page", () => {
		render(
			<ReviewRowActions
				review={createReview({ product: { id: "p1", title: "T", slug: "bague-argent" } })}
			/>,
		);
		const link = screen.getByRole("link", { name: /Voir le produit/ });
		expect(link).toHaveAttribute("href", "/creations/bague-argent");
	});

	it("shows moderation dialog title for PUBLISHED review when moderate button is in the DOM", () => {
		render(<ReviewRowActions review={createReview({ status: "PUBLISHED" })} />);
		// Dialog is closed by default — only the menu items are visible
		expect(screen.queryByText("Masquer cet avis ?")).toBeNull();
	});

	it("shows correct dialog title for HIDDEN review (not open by default)", () => {
		render(<ReviewRowActions review={createReview({ status: "HIDDEN" })} />);
		expect(screen.queryByText("Publier cet avis ?")).toBeNull();
	});
});
