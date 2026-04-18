import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOpenDrawer, mockHaptic } = vi.hoisted(() => ({
	mockOpenDrawer: vi.fn(),
	mockHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpenDrawer }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("../product-item-drawer", () => ({
	PRODUCT_ITEM_DRAWER_ID: "product-item-drawer",
}));

vi.mock("@/shared/components/selectable-mobile-card", () => ({
	SelectableMobileCard: ({
		children,
		ariaLabel,
		onOpen,
	}: {
		children: React.ReactNode;
		ariaLabel: string;
		onOpen?: () => void;
	}) => (
		<button
			type="button"
			onClick={() => {
				mockHaptic("selection");
				onOpen?.();
			}}
			aria-label={ariaLabel}
		>
			{children}
		</button>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="product-image" {...rest} />
	),
}));

vi.mock("lucide-react", () => ({
	Package: () => <svg data-testid="icon-package" />,
}));

// Import après mocks
import { ProductStatus } from "@/app/generated/prisma/enums";
import { ProductMobileItem } from "../product-mobile-item";

// ============================================================================
// FIXTURES
// ============================================================================

const baseProduct = {
	id: "p-1",
	slug: "anneau-doré",
	title: "Anneau doré",
	status: ProductStatus.PUBLIC,
	type: { label: "Bagues" },
	skus: [
		{
			priceInclTax: 4500,
			inventory: 10,
			images: [
				{
					url: "https://cdn/img.jpg",
					thumbnailUrl: "https://cdn/img-thumb.jpg",
					blurDataUrl: "data:image/png;base64,xxx",
					isPrimary: true,
				},
			],
		},
		{
			priceInclTax: 5500,
			inventory: 5,
			images: [],
		},
	],
};

// ============================================================================
// TESTS
// ============================================================================

describe("ProductMobileItem", () => {
	beforeEach(() => {
		mockOpenDrawer.mockReset();
		mockHaptic.mockReset();
	});

	afterEach(cleanup);

	it("rend le titre et le badge de statut", () => {
		render(<ProductMobileItem product={baseProduct} />);
		expect(screen.getByText("Anneau doré")).toBeInTheDocument();
		expect(screen.getByText("Public")).toBeInTheDocument();
	});

	it("affiche la fourchette de prix min-max et le stock total", () => {
		render(<ProductMobileItem product={baseProduct} />);
		expect(screen.getByText(/45,00\s*€\s*–\s*55,00\s*€/)).toBeInTheDocument();
		expect(screen.getByText("15 en stock")).toBeInTheDocument();
		expect(screen.getByText("2 variantes")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("rend l'image principale quand disponible", () => {
		render(<ProductMobileItem product={baseProduct} />);
		const img = screen.getByTestId("product-image") as HTMLImageElement;
		expect(img.src).toBe("https://cdn/img-thumb.jpg");
	});

	it("rend le placeholder Package si pas d'image principale", () => {
		const noImg = {
			...baseProduct,
			skus: baseProduct.skus.map((s) => ({ ...s, images: [] })),
		};
		render(<ProductMobileItem product={noImg} />);
		expect(screen.getByTestId("icon-package")).toBeInTheDocument();
		expect(screen.queryByTestId("product-image")).not.toBeInTheDocument();
	});

	it("ouvre le drawer avec le bon payload au tap (haptic selection)", () => {
		render(<ProductMobileItem product={baseProduct} />);
		fireEvent.click(screen.getByLabelText("Produit Anneau doré"));

		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(mockOpenDrawer).toHaveBeenCalledWith({
			product: {
				id: "p-1",
				slug: "anneau-doré",
				title: "Anneau doré",
				status: "PUBLIC",
				priceDisplay: expect.stringMatching(/45,00\s*€\s*–\s*55,00\s*€/),
				stock: 15,
				variantsCount: 2,
				typeLabel: "Bagues",
				primaryImage: {
					url: "https://cdn/img.jpg",
					thumbnailUrl: "https://cdn/img-thumb.jpg",
					blurDataUrl: "data:image/png;base64,xxx",
				},
			},
		});
	});

	it("propage primaryImage à null si aucune image", () => {
		const noImg = {
			...baseProduct,
			skus: baseProduct.skus.map((s) => ({ ...s, images: [] })),
		};
		render(<ProductMobileItem product={noImg} />);
		fireEvent.click(screen.getByLabelText("Produit Anneau doré"));

		expect(mockOpenDrawer).toHaveBeenCalledWith(
			expect.objectContaining({
				product: expect.objectContaining({ primaryImage: null }),
			}),
		);
	});

	it("affiche un seul prix si min == max", () => {
		const samePrice = {
			...baseProduct,
			skus: [
				{ priceInclTax: 4500, inventory: 3, images: [] },
				{ priceInclTax: 4500, inventory: 2, images: [] },
			],
		};
		render(<ProductMobileItem product={samePrice} />);
		expect(screen.getByText(/^45,00\s*€$/)).toBeInTheDocument();
	});

	it("rend les 3 statuts (DRAFT/PUBLIC/ARCHIVED)", () => {
		const { rerender } = render(
			<ProductMobileItem product={{ ...baseProduct, status: ProductStatus.DRAFT }} />,
		);
		expect(screen.getByText("Brouillon")).toBeInTheDocument();

		rerender(<ProductMobileItem product={{ ...baseProduct, status: ProductStatus.ARCHIVED }} />);
		expect(screen.getByText("Archivé")).toBeInTheDocument();
	});
});
