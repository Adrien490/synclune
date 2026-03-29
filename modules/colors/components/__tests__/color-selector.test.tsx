import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterReplace, mockUseReducedMotion } = vi.hoisted(() => ({
	mockRouterReplace: vi.fn(),
	mockUseReducedMotion: vi.fn(() => false),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockRouterReplace }),
	usePathname: () => "/boutique/bague-etoile",
	useSearchParams: () => ({
		get: () => null,
		toString: () => "",
	}),
}));

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
			<div {...props}>{children}</div>
		),
	},
	useReducedMotion: mockUseReducedMotion,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/skus/services/sku-filter.service", () => ({
	filterCompatibleSkus: vi.fn(() => [
		{
			id: "sku-1",
			images: [{ url: "https://example.com/image.jpg" }],
		},
	]),
}));

vi.mock("@/shared/hooks/use-radio-group-keyboard", () => ({
	useRadioGroupKeyboard: vi.fn(() => ({
		containerRef: { current: null },
		handleKeyDown: vi.fn(),
	})),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { ColorSelector } from "../color-selector";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import type { Color } from "@/modules/skus/types/sku-selector.types";

// ============================================================================
// HELPERS
// ============================================================================

function createColor(overrides: Partial<Color> = {}): Color {
	return {
		id: "color-1",
		name: "Rouge",
		slug: "rouge",
		hex: "#FF0000",
		...overrides,
	} as unknown as Color;
}

function createProduct(): any {
	return {
		id: "prod-1",
		skus: [],
		media: [],
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ColorSelector", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(filterCompatibleSkus).mockReturnValue([
			{
				id: "sku-1",
				images: [{ url: "https://example.com/image.jpg" }],
			} as unknown as ReturnType<typeof filterCompatibleSkus>[0],
		]);
	});

	describe("empty state", () => {
		it("renders sr-only status when no colors", () => {
			render(<ColorSelector colors={[]} product={createProduct()} />);
			expect(screen.getByRole("status")).toBeInTheDocument();
			expect(screen.getByText("Aucune couleur disponible")).toBeInTheDocument();
		});
	});

	describe("with colors", () => {
		it("renders fieldset with aria-label", () => {
			const colors = [createColor()];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.getByRole("group", { name: /Sélection de couleur/ })).toBeInTheDocument();
		});

		it("renders the 'Couleur' legend by default", () => {
			const colors = [createColor()];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.getByText("Couleur")).toBeInTheDocument();
		});

		it("renders 'Couleur / Matériau' when showMaterialLabel=true", () => {
			const colors = [createColor()];
			render(<ColorSelector colors={colors} product={createProduct()} showMaterialLabel={true} />);
			expect(screen.getByText("Couleur / Matériau")).toBeInTheDocument();
		});

		it("renders a radio button per color", () => {
			const colors = [
				createColor({ id: "c-1", name: "Rouge", slug: "rouge" }),
				createColor({ id: "c-2", name: "Bleu", slug: "bleu" }),
			];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			const radios = screen.getAllByRole("radio");
			expect(radios).toHaveLength(2);
		});

		it("renders color name in the button", () => {
			const colors = [createColor({ name: "Rouge" })];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.getByText("Rouge")).toBeInTheDocument();
		});

		it("renders a color swatch when hex is provided", () => {
			const colors = [createColor({ hex: "#FF0000" })];
			const { container } = render(<ColorSelector colors={colors} product={createProduct()} />);
			const swatch = container.querySelector('[style*="background-color"]');
			expect(swatch).toBeInTheDocument();
		});

		it("button has aria-checked=false when not selected", () => {
			const colors = [createColor({ slug: "rouge" })];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
		});

		it("shows 'Indisponible' label when sku filter returns empty", () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			const colors = [createColor({ name: "Rouge" })];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.getByText("Indisponible")).toBeInTheDocument();
		});

		it("disables the button when color is unavailable", () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			const colors = [createColor({ slug: "rouge" })];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.getByRole("radio")).toBeDisabled();
		});

		it("calls router.replace when clicking a color button", async () => {
			const colors = [createColor({ slug: "rouge" })];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			await userEvent.click(screen.getByRole("radio"));
			expect(mockRouterReplace).toHaveBeenCalled();
		});
	});

	describe("reset button", () => {
		it("does not show reset button when no color is selected", () => {
			const colors = [createColor()];
			render(<ColorSelector colors={colors} product={createProduct()} />);
			expect(screen.queryByText("Réinitialiser")).not.toBeInTheDocument();
		});
	});
});
