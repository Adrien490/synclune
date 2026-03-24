import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockSearchParams, mockRouter, mockPathname } = vi.hoisted(() => ({
	mockSearchParams: { value: new URLSearchParams() },
	mockRouter: { replace: vi.fn() },
	mockPathname: { value: "/admin/catalogue/produits" },
}));

// ============================================================================
// Module mocks
// ============================================================================

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams.value,
	useRouter: () => mockRouter,
	usePathname: () => mockPathname.value,
}));

// Mock motion/react — render children statically without animation overhead
vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		button: ({
			children,
			className,
			onClick,
			"aria-label": ariaLabel,
			..._rest
		}: {
			children: React.ReactNode;
			className?: string;
			onClick?: () => void;
			"aria-label"?: string;
			[key: string]: unknown;
		}) => (
			<button type="button" className={className} onClick={onClick} aria-label={ariaLabel}>
				{children}
			</button>
		),
		div: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) => <div className={className}>{children}</div>,
		span: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) => <span className={className}>{children}</span>,
	},
	useReducedMotion: vi.fn(() => false),
	useMotionValue: vi.fn(() => ({ get: vi.fn(() => 0), set: vi.fn() })),
	useTransform: vi.fn(() => ({ get: vi.fn(() => 1) })),
}));

// Mock useIsMobile — always return desktop for consistent tests
vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: vi.fn(() => false),
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { ProductsFilterBadges } from "../products-filter-badges";

// ============================================================================
// Fixtures
// ============================================================================

const productTypes = [
	{ id: "type-1", label: "Bague", slug: "bague" },
	{ id: "type-2", label: "Collier", slug: "collier" },
	{ id: "type-3", label: "Bracelet", slug: "bracelet" },
];

const collections = [
	{ id: "col-1", name: "Collection Lune" },
	{ id: "col-2", name: "Collection Étoile" },
];

const colors = [
	{
		id: "clr-1",
		name: "Or rose",
		slug: "or-rose",
		hex: "#b76e79",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		_count: { skus: 3 },
	},
	{
		id: "clr-2",
		name: "Argent",
		slug: "argent",
		hex: "#c0c0c0",
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		_count: { skus: 5 },
	},
];

const materials = [
	{ id: "mat-1", name: "Or 18K", slug: "or-18k" },
	{ id: "mat-2", name: "Argent 925", slug: "argent-925" },
];

function renderBadges(params: URLSearchParams = new URLSearchParams()) {
	mockSearchParams.value = params;
	return render(
		<ProductsFilterBadges
			productTypes={productTypes}
			collections={collections}
			colors={colors}
			materials={materials}
		/>,
	);
}

// ============================================================================
// Tests
// ============================================================================

afterEach(() => {
	cleanup();
	mockSearchParams.value = new URLSearchParams();
});

describe("ProductsFilterBadges", () => {
	// --------------------------------------------------------------------------
	// No active filters
	// --------------------------------------------------------------------------

	describe("no active filters", () => {
		it("renders nothing when there are no filter params", () => {
			const { container } = renderBadges(new URLSearchParams());
			expect(container).toBeEmptyDOMElement();
		});

		it("does not render the filter region when no params are set", () => {
			renderBadges(new URLSearchParams());
			expect(screen.queryByRole("region", { name: "Filtres actifs" })).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Status filter
	// --------------------------------------------------------------------------

	describe("status filter", () => {
		it('renders "Brouillon" badge for DRAFT status', () => {
			const params = new URLSearchParams({ filter_status: "DRAFT" });
			renderBadges(params);

			expect(screen.getByText("Brouillon")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Statut Brouillon/ });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Public" badge for PUBLIC status', () => {
			const params = new URLSearchParams({ filter_status: "PUBLIC" });
			renderBadges(params);

			expect(screen.getByText("Public")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Statut Public/ });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Archivé" badge for ARCHIVED status', () => {
			const params = new URLSearchParams({ filter_status: "ARCHIVED" });
			renderBadges(params);

			expect(screen.getByText("Archivé")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Statut Archivé/ });
			expect(badge).toBeInTheDocument();
		});

		it("does not render a badge for an unknown status value", () => {
			const params = new URLSearchParams({ filter_status: "UNKNOWN" });
			renderBadges(params);

			expect(screen.queryByRole("button", { name: /Statut/ })).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Stock status filter
	// --------------------------------------------------------------------------

	describe("stock status filter", () => {
		it('renders "En stock" badge for in_stock', () => {
			const params = new URLSearchParams({ filter_stockStatus: "in_stock" });
			renderBadges(params);

			expect(screen.getByText("En stock")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Stock En stock/ });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Rupture de stock" badge for out_of_stock', () => {
			const params = new URLSearchParams({ filter_stockStatus: "out_of_stock" });
			renderBadges(params);

			expect(screen.getByText("Rupture de stock")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Stock Rupture de stock/ });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Stock faible" badge for low_stock', () => {
			const params = new URLSearchParams({ filter_stockStatus: "low_stock" });
			renderBadges(params);

			expect(screen.getByText("Stock faible")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Stock Stock faible/ });
			expect(badge).toBeInTheDocument();
		});

		it("does not render a badge for an unknown stock status value", () => {
			const params = new URLSearchParams({ filter_stockStatus: "unknown_value" });
			renderBadges(params);

			expect(screen.queryByRole("button", { name: /Stock/ })).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Price range filter
	// --------------------------------------------------------------------------

	describe("price range filter", () => {
		it("renders a single grouped price badge when both priceMin and priceMax are set", () => {
			const params = new URLSearchParams({
				filter_priceMin: "1000",
				filter_priceMax: "5000",
			});
			renderBadges(params);

			// Should have exactly one "Prix" label — priceMax must not create a second badge
			const prixLabels = screen.getAllByText("Prix :");
			expect(prixLabels).toHaveLength(1);
		});

		it("shows formatted euro values in the price badge", () => {
			const params = new URLSearchParams({
				filter_priceMin: "1000",
				filter_priceMax: "5000",
			});
			renderBadges(params);

			// 1000 cents = 10,00 € ; 5000 cents = 50,00 €
			expect(screen.getByText(/10,00/)).toBeInTheDocument();
			expect(screen.getByText(/50,00/)).toBeInTheDocument();
		});

		it("renders priceMin badge without a priceMax param (uses 50000 as default max)", () => {
			const params = new URLSearchParams({ filter_priceMin: "2000" });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: /Prix/ });
			expect(badge).toBeInTheDocument();
			// 2000 cents = 20,00 € ; default max 50000 cents = 500,00 €
			expect(badge.textContent).toMatch(/20,00/);
			expect(badge.textContent).toMatch(/500,00/);
		});

		it("does not render a standalone badge for priceMax alone", () => {
			const params = new URLSearchParams({ filter_priceMax: "5000" });
			renderBadges(params);

			// priceMax alone → formatProductFilter returns null → no badge
			expect(screen.queryByRole("button", { name: /Prix/ })).not.toBeInTheDocument();
		});

		it("renders priceMin badge with priceMin = 0 using 0 as min value", () => {
			const params = new URLSearchParams({
				filter_priceMin: "0",
				filter_priceMax: "3000",
			});
			renderBadges(params);

			const badge = screen.getByRole("button", { name: /Prix/ });
			expect(badge.textContent).toMatch(/0,00/);
			expect(badge.textContent).toMatch(/30,00/);
		});
	});

	// --------------------------------------------------------------------------
	// Product type filter
	// --------------------------------------------------------------------------

	describe("product type filter", () => {
		it("renders the type label resolved from the slug", () => {
			const params = new URLSearchParams({ filter_typeId: "bague" });
			renderBadges(params);

			expect(screen.getByText("Bague")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Type Bague/ });
			expect(badge).toBeInTheDocument();
		});

		it("renders a different type label when slug is collier", () => {
			const params = new URLSearchParams({ filter_typeId: "collier" });
			renderBadges(params);

			expect(screen.getByText("Collier")).toBeInTheDocument();
		});

		it("falls back to raw value when slug is not found in the lookup map", () => {
			const params = new URLSearchParams({ filter_typeId: "unknown-slug" });
			renderBadges(params);

			// Falls back to raw value as displayValue
			const badge = screen.getByRole("button", { name: /Type unknown-slug/ });
			expect(badge).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Collection filter
	// --------------------------------------------------------------------------

	describe("collection filter", () => {
		it("renders the collection name resolved from the id", () => {
			const params = new URLSearchParams({ filter_collectionId: "col-1" });
			renderBadges(params);

			expect(screen.getByText("Collection Lune")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Collection Collection Lune/ });
			expect(badge).toBeInTheDocument();
		});

		it("renders a different collection name for a different id", () => {
			const params = new URLSearchParams({ filter_collectionId: "col-2" });
			renderBadges(params);

			expect(screen.getByText("Collection Étoile")).toBeInTheDocument();
		});

		it("falls back to raw id when collection id is not found", () => {
			const params = new URLSearchParams({ filter_collectionId: "col-unknown" });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: /Collection col-unknown/ });
			expect(badge).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Color filter
	// --------------------------------------------------------------------------

	describe("color filter", () => {
		it("renders the color name resolved from the slug", () => {
			const params = new URLSearchParams({ filter_color: "or-rose" });
			renderBadges(params);

			expect(screen.getByText("Or rose")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Couleur Or rose/ });
			expect(badge).toBeInTheDocument();
		});

		it("renders a different color name for a different slug", () => {
			const params = new URLSearchParams({ filter_color: "argent" });
			renderBadges(params);

			expect(screen.getByText("Argent")).toBeInTheDocument();
		});

		it("falls back to raw slug when color slug is not found", () => {
			const params = new URLSearchParams({ filter_color: "vert-inconnu" });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: /Couleur vert-inconnu/ });
			expect(badge).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Material filter
	// --------------------------------------------------------------------------

	describe("material filter", () => {
		it("renders the material name resolved from the slug", () => {
			const params = new URLSearchParams({ filter_material: "or-18k" });
			renderBadges(params);

			expect(screen.getByText("Or 18K")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Matériau Or 18K/ });
			expect(badge).toBeInTheDocument();
		});

		it("renders a different material name for a different slug", () => {
			const params = new URLSearchParams({ filter_material: "argent-925" });
			renderBadges(params);

			expect(screen.getByText("Argent 925")).toBeInTheDocument();
		});

		it("falls back to raw slug when material slug is not found", () => {
			const params = new URLSearchParams({ filter_material: "titane-inconnu" });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: /Matériau titane-inconnu/ });
			expect(badge).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// onSale filter
	// --------------------------------------------------------------------------

	describe("onSale filter", () => {
		it('renders "En promotion" badge when onSale param is set', () => {
			const params = new URLSearchParams({ filter_onSale: "true" });
			renderBadges(params);

			expect(screen.getByText("En promotion")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Promotion En promotion/ });
			expect(badge).toBeInTheDocument();
		});

		it('renders "En promotion" regardless of the param value', () => {
			const params = new URLSearchParams({ filter_onSale: "1" });
			renderBadges(params);

			expect(screen.getByText("En promotion")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// isPublished filter
	// --------------------------------------------------------------------------

	describe("isPublished filter", () => {
		it('renders "Oui" for isPublished = true', () => {
			const params = new URLSearchParams({ filter_isPublished: "true" });
			renderBadges(params);

			expect(screen.getByText("Oui")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Publié Oui/ });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Non" for isPublished = false', () => {
			const params = new URLSearchParams({ filter_isPublished: "false" });
			renderBadges(params);

			expect(screen.getByText("Non")).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: /Publié Non/ });
			expect(badge).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Date filters
	// --------------------------------------------------------------------------

	describe("date filters", () => {
		// Use a fixed date to avoid locale-dependent failures
		const isoDate = "2025-06-15T00:00:00.000Z";
		// 15/06/2025 in fr-FR locale
		const frDate = new Date(isoDate).toLocaleDateString("fr-FR");

		it('renders "Créé après" badge with formatted date', () => {
			const params = new URLSearchParams({ filter_createdAfter: isoDate });
			renderBadges(params);

			expect(screen.getByText(frDate)).toBeInTheDocument();
			const badge = screen.getByRole("button", { name: new RegExp(`Créé après ${frDate}`) });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Créé avant" badge with formatted date', () => {
			const params = new URLSearchParams({ filter_createdBefore: isoDate });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: new RegExp(`Créé avant ${frDate}`) });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Modifié après" badge with formatted date', () => {
			const params = new URLSearchParams({ filter_updatedAfter: isoDate });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: new RegExp(`Modifié après ${frDate}`) });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Modifié avant" badge with formatted date', () => {
			const params = new URLSearchParams({ filter_updatedBefore: isoDate });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: new RegExp(`Modifié avant ${frDate}`) });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Publié après" badge with formatted date', () => {
			const params = new URLSearchParams({ filter_publishedAfter: isoDate });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: new RegExp(`Publié après ${frDate}`) });
			expect(badge).toBeInTheDocument();
		});

		it('renders "Publié avant" badge with formatted date', () => {
			const params = new URLSearchParams({ filter_publishedBefore: isoDate });
			renderBadges(params);

			const badge = screen.getByRole("button", { name: new RegExp(`Publié avant ${frDate}`) });
			expect(badge).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Multiple simultaneous filters
	// --------------------------------------------------------------------------

	describe("multiple simultaneous filters", () => {
		it("renders all active filter badges when several params are set", () => {
			const params = new URLSearchParams({
				filter_status: "PUBLIC",
				filter_stockStatus: "in_stock",
				filter_typeId: "bague",
				filter_collectionId: "col-1",
			});
			renderBadges(params);

			expect(screen.getByText("Public")).toBeInTheDocument();
			expect(screen.getByText("En stock")).toBeInTheDocument();
			expect(screen.getByText("Bague")).toBeInTheDocument();
			expect(screen.getByText("Collection Lune")).toBeInTheDocument();
		});

		it("renders price badge as a single badge even with both priceMin and priceMax", () => {
			const params = new URLSearchParams({
				filter_priceMin: "500",
				filter_priceMax: "10000",
				filter_status: "DRAFT",
			});
			renderBadges(params);

			// Only one "Prix :" label — priceMax does not produce a second badge
			const prixLabels = screen.getAllByText("Prix :");
			expect(prixLabels).toHaveLength(1);
			expect(screen.getByText("Brouillon")).toBeInTheDocument();
		});

		it("renders color and material badges alongside other filters", () => {
			const params = new URLSearchParams({
				filter_color: "or-rose",
				filter_material: "argent-925",
			});
			renderBadges(params);

			expect(screen.getByText("Or rose")).toBeInTheDocument();
			expect(screen.getByText("Argent 925")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Accessibility
	// --------------------------------------------------------------------------

	describe("accessibility", () => {
		it("renders a region with aria-label when there are active filters", () => {
			const params = new URLSearchParams({ filter_status: "PUBLIC" });
			renderBadges(params);

			expect(screen.getByRole("region", { name: "Filtres actifs" })).toBeInTheDocument();
		});

		it("each badge has an aria-label describing the filter to remove", () => {
			const params = new URLSearchParams({ filter_status: "DRAFT" });
			renderBadges(params);

			const button = screen.getByRole("button", { name: /Supprimer le filtre Statut Brouillon/ });
			expect(button).toBeInTheDocument();
		});

		it("renders the screen-reader filter count announcement", () => {
			const params = new URLSearchParams({
				filter_status: "PUBLIC",
				filter_color: "or-rose",
			});
			renderBadges(params);

			// The sr-only span announces the count
			expect(screen.getByText(/2 filtres actifs/)).toBeInTheDocument();
		});
	});
});
