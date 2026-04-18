import type { GetWishlistReturn } from "@/modules/wishlist/types/wishlist.types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
			<div className={className}>{children}</div>
		),
	},
	useReducedMotion: vi.fn(() => false),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { easing: { emphasized: [0.2, 0, 0, 1] } },
}));

vi.mock("@/shared/components/cursor-pagination", () => ({
	CursorPagination: () => <div data-testid="cursor-pagination" />,
}));

vi.mock("@/modules/products/components/product-card", () => ({
	ProductCard: ({
		product,
		index: _index,
	}: {
		product: { id: string; title: string };
		index: number;
		isInWishlist: boolean;
		sectionId: string;
	}) => <div data-testid={`product-card-${product.id}`}>{product.title}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
		size?: string;
	}) => (asChild ? <>{children}</> : <button>{children}</button>),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="empty" className={className}>
			{children}
		</div>
	),
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode; variant?: string }) => (
		<div>{children}</div>
	),
	EmptyTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("lucide-react", () => ({
	Heart: ({ className }: { className?: string }) => (
		<svg data-testid="icon-heart" className={className} />
	),
	Trash2: ({ className }: { className?: string }) => (
		<svg data-testid="icon-trash" className={className} />
	),
}));

vi.mock("@/modules/wishlist/contexts/wishlist-list-optimistic-context", () => ({
	WishlistListOptimisticContext: {
		Provider: ({ children }: { children: React.ReactNode; value: unknown }) => <>{children}</>,
	},
	useWishlistListOptimistic: vi.fn(() => null),
}));

vi.mock("@/modules/wishlist/hooks/use-swipe-to-remove", () => ({
	useSwipeToRemove: vi.fn(() => ({ swipeOffset: 0, isSwiping: false })),
	SWIPE_REMOVE_THRESHOLD: 80,
}));

vi.mock("@/modules/wishlist/hooks/use-remove-from-wishlist", () => ({
	useRemoveFromWishlist: vi.fn(() => ({
		action: vi.fn(),
		isPending: false,
		state: undefined,
	})),
}));

vi.mock("@/shared/utils/toast", () => ({
	toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/modules/wishlist/actions/add-to-wishlist", () => ({
	addToWishlist: vi.fn(),
}));

vi.mock("@/shared/stores/badge-counts-store", () => ({
	useBadgeCountsStore: (sel: (s: { incrementWishlist: () => void }) => unknown) =>
		sel({ incrementWishlist: vi.fn() }),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { WishlistListContent } from "../wishlist-list-content";

// ============================================================================
// HELPERS
// ============================================================================

function createItem(id: string, productId: string, title: string) {
	return {
		id,
		productId,
		createdAt: new Date(),
		updatedAt: new Date(),
		product: { id: productId, title },
	} as unknown as GetWishlistReturn["items"][number];
}

function createPagination(overrides = {}) {
	return {
		hasNextPage: false,
		hasPreviousPage: false,
		nextCursor: null,
		prevCursor: null,
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe("WishlistListContent", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when items array is empty", () => {
		render(
			<WishlistListContent
				items={[]}
				pagination={createPagination()}
				totalCount={0}
				perPage={12}
			/>,
		);
		expect(screen.getByTestId("empty")).toBeInTheDocument();
	});

	it("shows 'Votre wishlist est vide' in empty state", () => {
		render(
			<WishlistListContent
				items={[]}
				pagination={createPagination()}
				totalCount={0}
				perPage={12}
			/>,
		);
		expect(screen.getByRole("heading", { name: /wishlist est vide/i })).toBeInTheDocument();
	});

	it("shows discover link in empty state", () => {
		render(
			<WishlistListContent
				items={[]}
				pagination={createPagination()}
				totalCount={0}
				perPage={12}
			/>,
		);
		expect(screen.getByRole("link", { name: /Découvrir nos créations/i })).toBeInTheDocument();
	});

	it("announces empty wishlist to screen readers", () => {
		render(
			<WishlistListContent
				items={[]}
				pagination={createPagination()}
				totalCount={0}
				perPage={12}
			/>,
		);
		const status = document.querySelector('[role="status"]');
		expect(status).not.toBeNull();
		expect(status?.textContent).toContain("vide");
	});

	// ─── With items ───────────────────────────────────────────────────────────

	it("renders product cards for each item", () => {
		const items = [
			createItem("item-1", "prod-1", "Bague Lune"),
			createItem("item-2", "prod-2", "Collier Étoile"),
		];
		render(
			<WishlistListContent
				items={items}
				pagination={createPagination()}
				totalCount={2}
				perPage={12}
			/>,
		);
		expect(screen.getByTestId("product-card-prod-1")).toBeInTheDocument();
		expect(screen.getByTestId("product-card-prod-2")).toBeInTheDocument();
	});

	it("shows article count as singular when 1 item", () => {
		const items = [createItem("item-1", "prod-1", "Bague Lune")];
		render(
			<WishlistListContent
				items={items}
				pagination={createPagination()}
				totalCount={1}
				perPage={12}
			/>,
		);
		const text = document.body.textContent!;
		expect(text).toContain("1 article");
		expect(text).not.toContain("1 articles");
	});

	it("shows article count as plural when multiple items", () => {
		const items = [
			createItem("item-1", "prod-1", "Bague Lune"),
			createItem("item-2", "prod-2", "Collier Étoile"),
			createItem("item-3", "prod-3", "Bracelet"),
		];
		render(
			<WishlistListContent
				items={items}
				pagination={createPagination()}
				totalCount={3}
				perPage={12}
			/>,
		);
		expect(document.body.textContent).toContain("3 articles");
	});

	it("renders cursor pagination", () => {
		const items = [createItem("item-1", "prod-1", "Bague Lune")];
		render(
			<WishlistListContent
				items={items}
				pagination={createPagination()}
				totalCount={1}
				perPage={12}
			/>,
		);
		expect(screen.getByTestId("cursor-pagination")).toBeInTheDocument();
	});

	it("renders screen reader live region with item count", () => {
		const items = [createItem("item-1", "prod-1", "Bague Lune")];
		render(
			<WishlistListContent
				items={items}
				pagination={createPagination()}
				totalCount={1}
				perPage={12}
			/>,
		);
		const status = document.querySelector('[role="status"][aria-live="polite"]');
		expect(status).not.toBeNull();
		expect(status?.textContent).toContain("1 article");
	});
});
