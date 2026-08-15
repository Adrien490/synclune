import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFilterCompatibleVariants,
	mockUseRadioGroupKeyboard,
	mockSizeGuideDialog,
	mockRouterReplace,
	mockPathname,
	mockSearchParamsGet,
	mockSearchParamsToString,
	mockTriggerHaptic,
} = vi.hoisted(() => ({
	mockFilterCompatibleVariants: vi.fn(),
	mockUseRadioGroupKeyboard: vi.fn(),
	mockSizeGuideDialog: vi.fn(),
	mockRouterReplace: vi.fn(),
	mockPathname: vi.fn(),
	mockSearchParamsGet: vi.fn(),
	mockSearchParamsToString: vi.fn(),
	mockTriggerHaptic: vi.fn(),
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

vi.mock("@/modules/variants/services/variant-filter.service", () => ({
	filterCompatibleVariants: mockFilterCompatibleVariants,
}));

vi.mock("@/shared/hooks/use-radio-group-keyboard", () => ({
	useRadioGroupKeyboard: mockUseRadioGroupKeyboard,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
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
import type { Size } from "@/modules/variants/types/variant-selector.types";

// ============================================================================
// FIXTURES
// ============================================================================

const SIZES: Size[] = [{ size: "50" }, { size: "52" }, { size: "54" }];

function makeProduct() {
	return {
		id: "prod_1",
		title: "Bague Étoile",
		slug: "bague-etoile",
		variants: [
			{
				id: "variant-1",
				active: true,
				stock: 5,
				priceCents: 2999,
				size: "50",
				color: null,
				material: null,
				images: [],
			},
			{
				id: "variant-2",
				active: true,
				stock: 3,
				priceCents: 2999,
				size: "52",
				color: null,
				material: null,
				images: [],
			},
		],
		type: { slug: "bagues", label: "Bague" },
	};
}

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	mockSearchParamsGet.mockReturnValue(null);
	mockSearchParamsToString.mockReturnValue("");
	mockPathname.mockReturnValue("/boutique/produits/bague-etoile");
	mockFilterCompatibleVariants.mockReturnValue([{ id: "variant-1" }, { id: "variant-2" }]);
	mockUseRadioGroupKeyboard.mockReturnValue({
		containerRef: { current: null },
		handleKeyDown: vi.fn(),
		// Tabindex roving : le groupe est UN seul arrêt de tabulation (ARIA APG).
		getTabIndex: (_option: unknown, index: number) => (index === 0 ? 0 : -1),
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

		it("expose un radiogroup nommé par la légende", () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);

			expect(screen.getByRole("radiogroup", { name: /taille/i })).toBeInTheDocument();
			expect(screen.queryByRole("group", { name: /sélection de taille/i })).toBeNull();
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
				<SizeSelector sizes={SIZES} product={product} productTypeSlug="bagues" shouldShow={true} />,
			);

			expect(screen.getByText("Taille (Diamètre)")).toBeInTheDocument();
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

	describe("haptic feedback", () => {
		it("triggers selection haptic when clicking an available size", async () => {
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);
			await userEvent.click(screen.getByRole("radio", { name: /taille 50/i }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it("does not trigger haptic when size is disabled", async () => {
			mockFilterCompatibleVariants.mockReturnValue([]);
			const product = makeProduct() as unknown as Parameters<typeof SizeSelector>[0]["product"];
			render(<SizeSelector sizes={SIZES} product={product} shouldShow={true} />);
			await userEvent.click(screen.getByRole("radio", { name: /taille 50/i }));
			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});
	});
});
