import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFilterCompatibleSkus,
	mockUseRadioGroupKeyboard,
	mockSizeGuideDialog,
	mockRouterReplace,
	mockPathname,
	mockSearchParamsGet,
	mockSearchParamsToString,
} = vi.hoisted(() => ({
	mockFilterCompatibleSkus: vi.fn(),
	mockUseRadioGroupKeyboard: vi.fn(),
	mockSizeGuideDialog: vi.fn(),
	mockRouterReplace: vi.fn(),
	mockPathname: vi.fn(),
	mockSearchParamsGet: vi.fn(),
	mockSearchParamsToString: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockRouterReplace }),
	usePathname: () => mockPathname(),
	useSearchParams: () => ({
		get: mockSearchParamsGet,
		toString: mockSearchParamsToString,
	}),
}));

vi.mock("@/modules/skus/services/sku-filter.service", () => ({
	filterCompatibleSkus: mockFilterCompatibleSkus,
}));

vi.mock("@/shared/hooks/use-radio-group-keyboard", () => ({
	useRadioGroupKeyboard: mockUseRadioGroupKeyboard,
}));

vi.mock("motion/react", () => ({
	m: {
		div: ({
			children,
			...props
		}: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
			<div {...props}>{children}</div>
		),
	},
	useReducedMotion: () => false,
}));

// Mock the dynamic import for SizeGuideDialog
vi.mock("next/dynamic", () => ({
	default: (_: unknown) => {
		const MockSizeGuideDialog = (props: Record<string, unknown>) => {
			mockSizeGuideDialog(props);
			return <div data-testid="size-guide-dialog" />;
		};
		MockSizeGuideDialog.displayName = "SizeGuideDialog";
		return MockSizeGuideDialog;
	},
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { SizeSelector } from "../size-selector";
import type { Size } from "@/modules/skus/types/sku-selector.types";

// ============================================================================
// FIXTURES
// ============================================================================

const SIZES: Size[] = [{ size: "50" }, { size: "52" }, { size: "54" }];

function makeProduct() {
	return {
		id: "prod_1",
		title: "Bague Étoile",
		slug: "bague-etoile",
		skus: [
			{
				id: "sku-1",
				isActive: true,
				inventory: 5,
				priceInclTax: 2999,
				size: "50",
				color: null,
				material: null,
				images: [],
			},
			{
				id: "sku-2",
				isActive: true,
				inventory: 3,
				priceInclTax: 2999,
				size: "52",
				color: null,
				material: null,
				images: [],
			},
		],
		type: { slug: "rings", label: "Bague" },
	};
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockSearchParamsGet.mockReturnValue(null);
	mockSearchParamsToString.mockReturnValue("");
	mockPathname.mockReturnValue("/boutique/produits/bague-etoile");
	mockFilterCompatibleSkus.mockReturnValue([{ id: "sku-1" }, { id: "sku-2" }]);
	mockUseRadioGroupKeyboard.mockReturnValue({
		containerRef: { current: null },
		handleKeyDown: vi.fn(),
	});
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ============================================================================
// TESTS
// ============================================================================

describe("SizeSelector", () => {
	describe("shouldShow=false", () => {
		it("returns null when shouldShow is false", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			const { container } = render(
				<SizeSelector sizes={SIZES} product={product} shouldShow={false} />,
			);

			expect(container.firstChild).toBeNull();
		});

		it("returns null when sizes array is empty even if shouldShow is true", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			const { container } = render(<SizeSelector sizes={[]} product={product} shouldShow={true} />);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("shouldShow=true", () => {
		it("renders size buttons when shouldShow is true", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);

			expect(screen.getByRole("radio", { name: /taille 50/i })).toBeInTheDocument();
			expect(screen.getByRole("radio", { name: /taille 52/i })).toBeInTheDocument();
			expect(screen.getByRole("radio", { name: /taille 54/i })).toBeInTheDocument();
		});

		it("renders a fieldset with radiogroup role via aria-label", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);

			const fieldset = screen.getByRole("group", { name: /sélection de taille/i });

			expect(fieldset).toBeInTheDocument();
		});
	});

	describe("label based on productTypeSlug", () => {
		it("shows default label 'Taille' when no productTypeSlug", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);

			expect(screen.getByText("Taille")).toBeInTheDocument();
		});

		it("shows 'Taille (Diametre)' for ring product type", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(
				<SizeSelector sizes={SIZES} product={product} productTypeSlug="rings" shouldShow={true} />,
			);

			expect(screen.getByText("Taille (Diametre)")).toBeInTheDocument();
		});

		it("shows 'Taille (Tour de poignet)' for bracelet product type", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(
				<SizeSelector
					sizes={SIZES}
					product={product}
					productTypeSlug="bracelets"
					shouldShow={true}
				/>,
			);

			expect(screen.getByText("Taille (Tour de poignet)")).toBeInTheDocument();
		});
	});

	describe("selection state", () => {
		it("sets aria-checked='true' on the currently selected size", () => {
			mockSearchParamsGet.mockImplementation((key: string) => (key === "size" ? "52" : null));

			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);

			const size52Button = screen.getByRole("radio", { name: /taille 52/i });

			expect(size52Button).toHaveAttribute("aria-checked", "true");
		});
	});
});
