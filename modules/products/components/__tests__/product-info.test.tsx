import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub next/link
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

// Stub WishlistButton — not under test
vi.mock("@/modules/wishlist/components/wishlist-button", () => ({
	WishlistButton: ({
		productId,
		isInWishlist,
	}: {
		productId: string;
		productTitle: string;
		isInWishlist: boolean;
		size?: string;
	}) => (
		<button data-testid="wishlist-btn" data-product-id={productId} aria-pressed={isInWishlist}>
			{isInWishlist ? "Dans les favoris" : "Ajouter aux favoris"}
		</button>
	),
}));

// Stub ShareButton — not under test
vi.mock("@/modules/products/components/share-button", () => ({
	ShareButton: () => <button data-testid="share-btn">Partager</button>,
}));

import { ProductInfo } from "../product-info";
import type { GetProductReturn } from "@/modules/products/types/product.types";

afterEach(cleanup);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-1",
		title: "Collier Étoile",
		slug: "collier-etoile",
		type: null,
		skus: [],
		collections: [],
		...overrides,
	} as unknown as GetProductReturn;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProductInfo", () => {
	it("renders the product title", () => {
		render(<ProductInfo product={makeProduct()} />);

		// Le titre apparait dans deux endroits : h1 sr-only mobile + p[itemprop=name] visuel
		expect(screen.getAllByText("Collier Étoile").length).toBeGreaterThan(0);
	});

	it("renders the product type as an eyebrow above the title", () => {
		const product = makeProduct({
			type: { id: "t1", label: "Collier", slug: "collier" } as GetProductReturn["type"],
		});

		render(<ProductInfo product={product} />);

		expect(screen.getByText("Collier")).toBeInTheDocument();
	});

	it("does not render the type eyebrow when type is null", () => {
		render(<ProductInfo product={makeProduct({ type: null })} />);

		expect(screen.queryByText("Collier")).not.toBeInTheDocument();
	});

	it("renders a single share + wishlist cluster (no mobile/desktop duplicate)", () => {
		render(<ProductInfo product={makeProduct()} />);

		// Deux clusters cohabitaient (`sm:hidden` + `hidden sm:flex`), donc deux
		// boutons portant le même nom accessible dans l'arbre.
		expect(screen.getAllByTestId("wishlist-btn")).toHaveLength(1);
		expect(screen.getAllByTestId("share-btn")).toHaveLength(1);
	});

	it("renders the wishlist button with the correct product id", () => {
		render(<ProductInfo product={makeProduct()} />);

		const wishlistBtns = screen.getAllByTestId("wishlist-btn");
		expect(wishlistBtns.length).toBeGreaterThan(0);
		expect(wishlistBtns[0]).toHaveAttribute("data-product-id", "prod-1");
	});

	it("reflects the isInWishlist state on the wishlist button", () => {
		render(<ProductInfo product={makeProduct()} isInWishlist={true} />);

		const wishlistBtns = screen.getAllByTestId("wishlist-btn");
		expect(wishlistBtns[0]).toHaveAttribute("aria-pressed", "true");
	});

	it("renders the share button", () => {
		render(<ProductInfo product={makeProduct()} />);

		const shareBtns = screen.getAllByTestId("share-btn");
		expect(shareBtns.length).toBeGreaterThan(0);
	});

	it("exposes ONE h1 with the product title, visible at every viewport", () => {
		render(<ProductInfo product={makeProduct()} />);

		// Depuis l'harmonisation « L'étal continue », la fiche n'a plus de
		// PageHeader : ce h1 est l'unique porteur du titre, jamais masqué.
		const headings = screen.getAllByRole("heading", { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0]).toHaveTextContent("Collier Étoile");
		expect(headings[0]!.className).not.toMatch(/\bsr-only\b/);
		expect(headings[0]!.className).not.toMatch(/\bhidden\b/);
	});

	it("renders the handmade provenance line above-the-fold, in the first person", () => {
		render(<ProductInfo product={makeProduct()} />);

		expect(screen.getByText(/Fait main, chez moi, à Nantes/)).toBeInTheDocument();
	});
});
