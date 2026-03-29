import type { GetWishlistReturn } from "@/modules/wishlist/types/wishlist.types";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/wishlist/components/wishlist-list-content", () => ({
	WishlistListContent: ({
		items,
		totalCount,
	}: {
		items: unknown[];
		pagination: unknown;
		totalCount: number;
		perPage: number;
	}) => (
		<div data-testid="wishlist-list-content" data-count={totalCount}>
			{items.length} items
		</div>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant,
		size: _size,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
		size?: string;
	}) => (asChild ? <>{children}</> : <button data-variant={variant}>{children}</button>),
}));

vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="empty" className={className}>
			{children}
		</div>
	),
	EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { WishlistList } from "../wishlist-list";

// ============================================================================
// HELPERS
// ============================================================================

function createItem(id: string, productId: string) {
	return {
		id,
		productId,
		createdAt: new Date(),
		updatedAt: new Date(),
		product: { id: productId, title: `Product ${productId}` },
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

describe("WishlistList", () => {
	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders empty state when no items", async () => {
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items: [],
				pagination: createPagination(),
				totalCount: 0,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.getByTestId("empty")).toBeInTheDocument();
	});

	it("shows 'Votre wishlist est vide' in empty state", async () => {
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items: [],
				pagination: createPagination(),
				totalCount: 0,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.getByRole("heading", { name: /wishlist est vide/i })).toBeInTheDocument();
	});

	it("shows 'Découvrir nos créations' link in empty state", async () => {
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items: [],
				pagination: createPagination(),
				totalCount: 0,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.getByRole("link", { name: /Découvrir nos créations/i })).toBeInTheDocument();
	});

	it("shows 'Voir les collections' link in empty state", async () => {
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items: [],
				pagination: createPagination(),
				totalCount: 0,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.getByRole("link", { name: /Voir les collections/i })).toBeInTheDocument();
	});

	// ─── With items ───────────────────────────────────────────────────────────

	it("renders WishlistListContent when items exist", async () => {
		const items = [createItem("item-1", "prod-1"), createItem("item-2", "prod-2")];
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items,
				pagination: createPagination(),
				totalCount: 2,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.getByTestId("wishlist-list-content")).toBeInTheDocument();
	});

	it("passes totalCount to WishlistListContent", async () => {
		const items = [createItem("item-1", "prod-1")];
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items,
				pagination: createPagination(),
				totalCount: 42,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.getByTestId("wishlist-list-content")).toHaveAttribute("data-count", "42");
	});

	it("does not render empty state when items exist", async () => {
		const items = [createItem("item-1", "prod-1")];
		const Component = await WishlistList({
			wishlistPromise: Promise.resolve({
				items,
				pagination: createPagination(),
				totalCount: 1,
			}),
			perPage: 12,
		});
		render(Component);
		expect(screen.queryByTestId("empty")).toBeNull();
	});
});
