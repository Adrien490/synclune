import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<a href={href} onClick={onClick} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/stagger", () => ({
	Stagger: ({
		children,
		className,
		role,
		as: Container = "div",
		itemAs: ItemTag = "div",
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		className?: string;
		role?: string;
		as?: "div" | "ul" | "ol";
		itemAs?: "div" | "li";
		"aria-label"?: string;
	}) => (
		<Container className={className} role={role} aria-label={ariaLabel}>
			{React.Children.map(children, (child, index) => (
				<ItemTag key={index}>{child}</ItemTag>
			))}
		</Container>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (n: number) => `${(n / 100).toFixed(2)} €`,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/utils/with-view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

// Motion mocks — AnimatePresence and m.div just render children
vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			className,
			role,
			..._rest
		}: {
			children: React.ReactNode;
			className?: string;
			role?: string;
			[key: string]: unknown;
		}) => (
			<div className={className} role={role}>
				{children}
			</div>
		),
		li: ({
			children,
			className,
			role,
			..._rest
		}: {
			children: React.ReactNode;
			className?: string;
			role?: string;
			[key: string]: unknown;
		}) => (
			<li className={className} role={role}>
				{children}
			</li>
		),
	},
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { IdleContent } from "../idle-content";
import type { QuickSearchCollection, RecentlyViewedProduct } from "../constants";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockProduct: RecentlyViewedProduct = {
	slug: "bague-lune",
	title: "Bague Lune",
	price: 4500,
	image: { url: "/img/bague.jpg", blurDataUrl: null },
};

const mockProduct2: RecentlyViewedProduct = {
	slug: "collier-etoile",
	title: "Collier Etoile",
	price: 6000,
	image: null,
};

const mockCollections: QuickSearchCollection[] = [
	{ slug: "bagues", name: "Bagues", productCount: 10, image: null },
	{ slug: "colliers", name: "Colliers", productCount: 8, image: null },
];

const defaultProps = {
	recentlyViewed: [],
	searches: [],
	collections: [],
	onClose: vi.fn(),
	onRecentSearch: vi.fn(),
	onRemoveSearch: vi.fn(),
	onClearSearches: vi.fn(),
	isPending: false,
};

afterEach(() => {
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("IdleContent", () => {
	let onClose: () => void;
	let onRecentSearch: (term: string) => void;
	let onRemoveSearch: (term: string) => void;
	let onClearSearches: () => void;

	beforeEach(() => {
		onClose = vi.fn();
		onRecentSearch = vi.fn();
		onRemoveSearch = vi.fn();
		onClearSearches = vi.fn();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	describe("empty state", () => {
		it("shows empty state message when no content at all", () => {
			render(<IdleContent {...defaultProps} />);
			expect(screen.getByText("Trouvez votre prochain bijou")).toBeInTheDocument();
		});

		it("has a link to /produits in the empty state", () => {
			const { container } = render(<IdleContent {...defaultProps} />);
			expect(container.querySelector('a[href="/produits"]')).toBeInTheDocument();
		});

		it("has role='status' on empty state container", () => {
			render(<IdleContent {...defaultProps} />);
			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("does not show recently viewed section when empty", () => {
			render(<IdleContent {...defaultProps} />);
			expect(screen.queryByText("Vus récemment")).not.toBeInTheDocument();
		});

		it("does not show recent searches section when empty", () => {
			render(<IdleContent {...defaultProps} />);
			expect(screen.queryByText("Recherches récentes")).not.toBeInTheDocument();
		});

		it("does not show collections section when empty", () => {
			render(<IdleContent {...defaultProps} />);
			expect(screen.queryByText("Collections")).not.toBeInTheDocument();
		});
	});

	// ─── Recently Viewed ──────────────────────────────────────────────────────

	describe("recently viewed", () => {
		it("shows the recently viewed section heading when products are present", () => {
			render(<IdleContent {...defaultProps} onClose={onClose} recentlyViewed={[mockProduct]} />);
			expect(screen.getByText("Vus récemment")).toBeInTheDocument();
		});

		it("renders a link for each recently viewed product", () => {
			const { container } = render(
				<IdleContent
					{...defaultProps}
					onClose={onClose}
					recentlyViewed={[mockProduct, mockProduct2]}
				/>,
			);
			expect(container.querySelector('a[href="/creations/bague-lune"]')).toBeInTheDocument();
			expect(container.querySelector('a[href="/creations/collier-etoile"]')).toBeInTheDocument();
		});

		it("displays product title and formatted price", () => {
			render(<IdleContent {...defaultProps} onClose={onClose} recentlyViewed={[mockProduct]} />);
			expect(screen.getByText("Bague Lune")).toBeInTheDocument();
			expect(screen.getByText("45.00 €")).toBeInTheDocument();
		});

		it("renders image when product has an image", () => {
			const { container } = render(
				<IdleContent {...defaultProps} onClose={onClose} recentlyViewed={[mockProduct]} />,
			);
			const img = container.querySelector("img");
			expect(img).toBeInTheDocument();
			expect(img).toHaveAttribute("src", "/img/bague.jpg");
			expect(img).toHaveAttribute("alt", "Bague Lune");
		});

		it("renders placeholder div when product has no image", () => {
			const { container } = render(
				<IdleContent {...defaultProps} onClose={onClose} recentlyViewed={[mockProduct2]} />,
			);
			expect(container.querySelector("img")).not.toBeInTheDocument();
		});

		it("has aria-labelledby on the section for recently viewed", () => {
			const { container } = render(
				<IdleContent {...defaultProps} onClose={onClose} recentlyViewed={[mockProduct]} />,
			);
			const section = container.querySelector('[aria-labelledby="recently-viewed-heading"]');
			expect(section).toBeInTheDocument();
		});

		it("does not show empty state when recentlyViewed has items", () => {
			render(<IdleContent {...defaultProps} onClose={onClose} recentlyViewed={[mockProduct]} />);
			expect(screen.queryByText("Trouvez votre prochain bijou")).not.toBeInTheDocument();
		});
	});

	// ─── Recent Searches ──────────────────────────────────────────────────────

	describe("recent searches", () => {
		it("shows the recent searches section when searches are present", () => {
			render(
				<IdleContent
					{...defaultProps}
					onRecentSearch={onRecentSearch}
					onRemoveSearch={onRemoveSearch}
					onClearSearches={onClearSearches}
					searches={["bague", "collier"]}
				/>,
			);
			expect(screen.getByText("Recherches récentes")).toBeInTheDocument();
		});

		it("renders a button for each recent search term", () => {
			render(
				<IdleContent
					{...defaultProps}
					onRecentSearch={onRecentSearch}
					onRemoveSearch={onRemoveSearch}
					onClearSearches={onClearSearches}
					searches={["bague", "collier"]}
				/>,
			);
			expect(screen.getByText("bague")).toBeInTheDocument();
			expect(screen.getByText("collier")).toBeInTheDocument();
		});

		it("calls onRecentSearch with the term when a search button is clicked", async () => {
			render(
				<IdleContent {...defaultProps} onRecentSearch={onRecentSearch} searches={["bague"]} />,
			);
			// Find the search term button (not the remove button)
			const searchBtn = screen.getByText("bague").closest("button");
			await userEvent.click(searchBtn!);
			expect(onRecentSearch).toHaveBeenCalledWith("bague");
		});

		it("calls onRemoveSearch with the term when remove button is clicked", async () => {
			render(
				<IdleContent {...defaultProps} onRemoveSearch={onRemoveSearch} searches={["bague"]} />,
			);
			const removeBtn = screen.getByRole("button", { name: 'Supprimer "bague"' });
			await userEvent.click(removeBtn);
			expect(onRemoveSearch).toHaveBeenCalledWith("bague");
		});

		it("calls onClearSearches when Effacer button is clicked", async () => {
			render(
				<IdleContent {...defaultProps} onClearSearches={onClearSearches} searches={["bague"]} />,
			);
			const clearBtn = screen.getByRole("button", {
				name: "Effacer toutes les recherches récentes",
			});
			await userEvent.click(clearBtn);
			expect(onClearSearches).toHaveBeenCalledOnce();
		});

		it("disables search buttons when isPending is true", () => {
			render(<IdleContent {...defaultProps} searches={["bague"]} isPending={true} />);
			const btn = screen.getByText("bague").closest("button");
			expect(btn).toBeDisabled();
		});

		it("disables remove button when isPending is true", () => {
			render(<IdleContent {...defaultProps} searches={["bague"]} isPending={true} />);
			const removeBtn = screen.getByRole("button", { name: 'Supprimer "bague"' });
			expect(removeBtn).toBeDisabled();
		});

		it("disables clear button when isPending is true", () => {
			render(<IdleContent {...defaultProps} searches={["bague"]} isPending={true} />);
			const clearBtn = screen.getByRole("button", {
				name: "Effacer toutes les recherches récentes",
			});
			expect(clearBtn).toBeDisabled();
		});

		it("has aria-labelledby on the recent searches section", () => {
			const { container } = render(<IdleContent {...defaultProps} searches={["bague"]} />);
			const section = container.querySelector('[aria-labelledby="recent-searches-heading"]');
			expect(section).toBeInTheDocument();
		});

		it("renders a role='list' container for searches", () => {
			render(<IdleContent {...defaultProps} searches={["bague"]} />);
			expect(screen.getByRole("list")).toBeInTheDocument();
		});

		it("renders role='listitem' for each search term", () => {
			render(<IdleContent {...defaultProps} searches={["bague", "collier"]} />);
			expect(screen.getAllByRole("listitem")).toHaveLength(2);
		});

		it("remove button has descriptive aria-label with term name", () => {
			render(<IdleContent {...defaultProps} searches={["bague argent"]} />);
			expect(screen.getByRole("button", { name: 'Supprimer "bague argent"' })).toBeInTheDocument();
		});
	});

	// ─── Collections ─────────────────────────────────────────────────────────

	describe("collections", () => {
		it("shows the collections section when collections are present", () => {
			render(<IdleContent {...defaultProps} collections={mockCollections} />);
			expect(screen.getByText("Collections")).toBeInTheDocument();
		});

		it("renders a link for each collection", () => {
			const { container } = render(<IdleContent {...defaultProps} collections={mockCollections} />);
			expect(container.querySelector('a[href="/collections/bagues"]')).toBeInTheDocument();
			expect(container.querySelector('a[href="/collections/colliers"]')).toBeInTheDocument();
		});

		it("shows 'Voir toutes les collections' link", () => {
			const { container } = render(<IdleContent {...defaultProps} collections={mockCollections} />);
			expect(container.querySelector('a[href="/collections"]')).toBeInTheDocument();
			expect(screen.getByText(/voir toutes les collections/i)).toBeInTheDocument();
		});

		it("has aria-labelledby on the collections section", () => {
			const { container } = render(<IdleContent {...defaultProps} collections={mockCollections} />);
			const section = container.querySelector('[aria-labelledby="collections-heading"]');
			expect(section).toBeInTheDocument();
		});

		it("renders role='listitem' for each collection card", () => {
			render(<IdleContent {...defaultProps} collections={mockCollections} />);
			expect(screen.getAllByRole("listitem")).toHaveLength(mockCollections.length);
		});
	});

	// ─── Mixed content ────────────────────────────────────────────────────────

	describe("mixed content", () => {
		it("does not show empty state when any content is present", () => {
			render(<IdleContent {...defaultProps} searches={["bague"]} />);
			expect(screen.queryByText("Trouvez votre prochain bijou")).not.toBeInTheDocument();
		});

		it("renders all sections when all content is provided", () => {
			render(
				<IdleContent
					{...defaultProps}
					onClose={onClose}
					onRecentSearch={onRecentSearch}
					onRemoveSearch={onRemoveSearch}
					onClearSearches={onClearSearches}
					recentlyViewed={[mockProduct]}
					searches={["bague"]}
					collections={mockCollections}
				/>,
			);
			expect(screen.getByText("Vus récemment")).toBeInTheDocument();
			expect(screen.getByText("Recherches récentes")).toBeInTheDocument();
			expect(screen.getByText("Collections")).toBeInTheDocument();
		});
	});
});
