import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockFilterCompatibleVariants,
	mockUseRadioGroupKeyboard,
	mockRouterReplace,
	mockPathname,
	mockSearchParamsGet,
	mockSearchParamsToString,
	mockTriggerHaptic,
} = vi.hoisted(() => ({
	mockFilterCompatibleVariants: vi.fn(),
	mockUseRadioGroupKeyboard: vi.fn(),
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

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { MaterialSelector } from "../material-selector";
import type { Material } from "@/modules/variants/types/variant-selector.types";

// ============================================================================
// FIXTURES
// ============================================================================

const MATERIALS: Material[] = [{ name: "Argent 925" }, { name: "Or 18k" }];

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
				material: { name: "Argent 925" },
				color: null,
				size: null,
				images: [],
			},
			{
				id: "variant-2",
				active: true,
				stock: 3,
				priceCents: 4999,
				material: { name: "Or 18k" },
				color: null,
				size: null,
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

describe("MaterialSelector", () => {
	describe("render", () => {
		it("renders the 'Matériau' label", () => {
			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);

			expect(screen.getByText("Matériau")).toBeInTheDocument();
		});

		it("renders a button for each material", () => {
			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);

			expect(screen.getByText("Argent 925")).toBeInTheDocument();
			expect(screen.getByText("Or 18k")).toBeInTheDocument();
		});

		it("expose un radiogroup nommé par la légende", () => {
			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);

			expect(screen.getByRole("radiogroup", { name: /matériau/i })).toBeInTheDocument();
			expect(screen.queryByRole("group", { name: /sélection de matériau/i })).toBeNull();
		});
	});

	describe("selection state", () => {
		it("sets aria-checked='true' on the currently selected material", () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === "material" ? "Argent 925" : null,
			);

			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);

			const argent925Button = screen.getByRole("radio", { name: /argent 925/i });

			expect(argent925Button).toHaveAttribute("aria-checked", "true");
		});

		it("sets aria-checked='false' on unselected materials", () => {
			mockSearchParamsGet.mockImplementation((key: string) =>
				key === "material" ? "Argent 925" : null,
			);

			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);

			const or18kButton = screen.getByRole("radio", { name: /or 18k/i });

			expect(or18kButton).toHaveAttribute("aria-checked", "false");
		});
	});

	describe("conditional render", () => {
		it("returns null when only one material is provided", () => {
			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			const { container } = render(
				<MaterialSelector materials={[{ name: "Argent 925" }]} product={product} />,
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe("haptic feedback", () => {
		it("triggers selection haptic when clicking an available material", async () => {
			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);
			await userEvent.click(screen.getByRole("radio", { name: /argent 925/i }));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it("does not trigger haptic when material is disabled", async () => {
			mockFilterCompatibleVariants.mockReturnValue([]);
			const product = makeProduct() as unknown as Parameters<typeof MaterialSelector>[0]["product"];
			render(<MaterialSelector materials={MATERIALS} product={product} />);
			await userEvent.click(screen.getByRole("radio", { name: /argent 925/i }));
			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});
	});
});
