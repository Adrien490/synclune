import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouterReplace, mockUseReducedMotion, mockTriggerHaptic, mockSearchParams } = vi.hoisted(
	() => ({
		mockRouterReplace: vi.fn(),
		mockUseReducedMotion: vi.fn(() => false),
		mockTriggerHaptic: vi.fn(),
		mockSearchParams: {
			get: vi.fn((_key: string): string | null => null),
			toString: vi.fn((): string => ""),
		},
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockRouterReplace }),
	usePathname: () => "/boutique/bague-etoile",
	useSearchParams: () => mockSearchParams,
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

vi.mock("@/modules/skus/services/sku-info-extraction.service", () => ({
	buildComboKey: (slugs: string[]) => [...slugs].sort().join("__"),
}));

vi.mock("@/modules/colors/utils/swatch-style", () => ({
	buildSwatchStyle: (hexes: string[]) => ({ backgroundColor: hexes[0] ?? "transparent" }),
	areAllColorsLight: () => false,
}));

vi.mock("@/modules/colors/utils/color-contrast.utils", () => ({
	isLightColor: () => false,
}));

vi.mock("@/shared/hooks/use-radio-group-keyboard", () => ({
	useRadioGroupKeyboard: vi.fn(() => ({
		containerRef: { current: null },
		handleKeyDown: vi.fn(),
	})),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: mockTriggerHaptic,
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
import type { ColorCombo } from "@/shared/types/product-sku.types";

// ============================================================================
// HELPERS
// ============================================================================

function createCombo(overrides: Partial<ColorCombo> = {}): ColorCombo {
	const base: ColorCombo = {
		comboKey: "rouge",
		colors: [{ id: "c-1", slug: "rouge", hex: "#FF0000", name: "Rouge", position: 0 }],
		hexes: ["#FF0000"],
		names: ["Rouge"],
		label: "Rouge",
		ariaLabel: "Rouge",
		inStock: true,
		skuCount: 1,
	};
	return { ...base, ...overrides };
}

function createProduct() {
	return { id: "prod-1", skus: [], media: [] } as never;
}

function setSearchParam(key: string, value: string | null) {
	mockSearchParams.get.mockImplementation((k: string) => (k === key ? value : null));
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	mockSearchParams.get.mockReset();
	mockSearchParams.get.mockReturnValue(null);
	mockSearchParams.toString.mockReset();
	mockSearchParams.toString.mockReturnValue("");
});

describe("ColorSelector", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.get.mockReturnValue(null);
		mockSearchParams.toString.mockReturnValue("");
		vi.mocked(filterCompatibleSkus).mockReturnValue([
			{
				id: "sku-1",
				images: [{ url: "https://example.com/image.jpg" }],
			} as unknown as ReturnType<typeof filterCompatibleSkus>[0],
		]);
	});

	describe("empty state", () => {
		it("renders sr-only status when no combos", () => {
			render(<ColorSelector combos={[]} product={createProduct()} />);
			expect(screen.getByRole("status")).toBeInTheDocument();
			expect(screen.getByText("Aucune couleur disponible")).toBeInTheDocument();
		});
	});

	describe("rendering", () => {
		it("renders fieldset with aria-label for variant selection", () => {
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			expect(screen.getByRole("group", { name: /Sélection de la variante/ })).toBeInTheDocument();
		});

		it("renders the 'Couleur' legend by default", () => {
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			expect(screen.getByText("Couleur")).toBeInTheDocument();
		});

		it("renders 'Couleur / Matériau' when showMaterialLabel=true", () => {
			render(
				<ColorSelector combos={[createCombo()]} product={createProduct()} showMaterialLabel />,
			);
			expect(screen.getByText("Couleur / Matériau")).toBeInTheDocument();
		});

		it("renders a radio button per combo", () => {
			const combos = [
				createCombo({ comboKey: "rouge", label: "Rouge", ariaLabel: "Rouge" }),
				createCombo({ comboKey: "bleu", label: "Bleu", ariaLabel: "Bleu" }),
			];
			render(<ColorSelector combos={combos} product={createProduct()} />);
			expect(screen.getAllByRole("radio")).toHaveLength(2);
		});

		it("renders combo label in the button", () => {
			render(
				<ColorSelector
					combos={[createCombo({ label: "Or rose + Argent" })]}
					product={createProduct()}
				/>,
			);
			expect(screen.getByText("Or rose + Argent")).toBeInTheDocument();
		});

		it("uses ariaLabel (with 'et' joiner) for SR, not the visual label", () => {
			render(
				<ColorSelector
					combos={[createCombo({ label: "Or rose + Argent", ariaLabel: "Or rose et Argent" })]}
					product={createProduct()}
				/>,
			);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-label", "Or rose et Argent");
		});

		it("renders the color swatch with viewTransitionName for morphing", () => {
			const { container } = render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			const swatch = container.querySelector('[style*="view-transition-name"]');
			expect(swatch).toBeInTheDocument();
		});
	});

	describe("selection state", () => {
		it("button has aria-checked=false when not selected", () => {
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
		});

		it("button has aria-checked=true when URL ?variant matches", () => {
			setSearchParam("variant", "rouge");
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
		});

		it("displays current combo label in the legend", () => {
			setSearchParam("variant", "rouge");
			render(
				<ColorSelector
					combos={[createCombo({ comboKey: "rouge", label: "Rouge" })]}
					product={createProduct()}
				/>,
			);
			expect(screen.getByText(": Rouge")).toBeInTheDocument();
		});
	});

	describe("URL sync", () => {
		it("calls router.replace with ?variant= when clicking a combo", async () => {
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			await userEvent.click(screen.getByRole("radio"));
			expect(mockRouterReplace).toHaveBeenCalledWith(expect.stringContaining("variant=rouge"), {
				scroll: false,
			});
		});

		it("derives combo from legacy ?color=<slug> when no ?variant=", () => {
			setSearchParam("color", "rouge");
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
		});
	});

	describe("haptic feedback", () => {
		it("triggers selection haptic when clicking an available combo", async () => {
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			await userEvent.click(screen.getByRole("radio"));
			expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
		});

		it("does not trigger haptic when clicking an unavailable combo", async () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			await userEvent.click(screen.getByRole("radio"));
			expect(mockTriggerHaptic).not.toHaveBeenCalled();
		});
	});

	describe("reset button", () => {
		it("does not show reset button when no combo is selected", () => {
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			expect(screen.queryByText("Réinitialiser")).not.toBeInTheDocument();
		});

		it("shows reset button when a combo is selected via URL", () => {
			setSearchParam("variant", "rouge");
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			expect(screen.getByText("Réinitialiser")).toBeInTheDocument();
		});

		it("calls router.replace and removes ?variant= when reset is clicked", async () => {
			setSearchParam("variant", "rouge");
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			await userEvent.click(screen.getByText("Réinitialiser"));
			expect(mockRouterReplace).toHaveBeenCalled();
			const call = mockRouterReplace.mock.calls.at(-1)?.[0] as string;
			expect(call).not.toContain("variant=");
		});
	});

	// =========================================================================
	// REGRESSION SUITE
	// =========================================================================

	/**
	 * @regression color-selector-aria-disabled-keyboard-2026-05-24
	 * F3 — Les options indisponibles doivent rester focusables au clavier
	 * (aria-disabled) pour être annoncées par les lecteurs d'écran. Bug
	 * d'origine : `disabled` HTML retirait le bouton du flux focusable +
	 * `useRadioGroupKeyboard` les skippait → invisible pour SR (violation
	 * WCAG 1.3.1).
	 */
	describe("@regression aria-disabled focusable", () => {
		it("unavailable combo button is NOT HTML disabled (stays focusable)", () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			expect(screen.getByRole("radio")).not.toBeDisabled();
		});

		it("unavailable combo button has aria-disabled=true", () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-disabled", "true");
		});

		it("unavailable combo button has aria-label suffix '(indisponible)'", () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			render(
				<ColorSelector combos={[createCombo({ ariaLabel: "Rouge" })]} product={createProduct()} />,
			);
			expect(screen.getByRole("radio")).toHaveAttribute("aria-label", "Rouge (indisponible)");
		});

		it("clicking an unavailable combo does not call router.replace (onClick guard)", async () => {
			vi.mocked(filterCompatibleSkus).mockReturnValue([]);
			render(<ColorSelector combos={[createCombo()]} product={createProduct()} />);
			await userEvent.click(screen.getByRole("radio"));
			expect(mockRouterReplace).not.toHaveBeenCalled();
		});
	});

	/**
	 * @regression color-selector-url-stale-variant-2026-05-24
	 * F2 — Un `?variant=` pointant vers un comboKey inexistant (combo retiré
	 * du catalogue, bookmark vieillot, partage social) doit retomber sur le
	 * defaultSku au lieu de laisser l'UI en état "rien de sélectionné"
	 * silencieux.
	 */
	describe("@regression URL stale variant fallback", () => {
		it("falls back to defaultSku when ?variant= references a non-existent combo", () => {
			setSearchParam("variant", "or-rose__inexistant");
			const defaultSku = {
				colors: [{ color: { slug: "argent" } }],
			} as unknown as Parameters<typeof ColorSelector>[0]["defaultSku"];
			render(
				<ColorSelector
					combos={[createCombo({ comboKey: "argent", label: "Argent", ariaLabel: "Argent" })]}
					product={createProduct()}
					defaultSku={defaultSku}
				/>,
			);
			// Le combo "argent" (defaultSku) doit être checked, pas l'URL stale.
			expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "true");
			// La légende affiche le label du default, pas une chaîne vide / orpheline.
			expect(screen.getByText(": Argent")).toBeInTheDocument();
		});

		it("renders normally without selection when no defaultSku and ?variant= is stale", () => {
			setSearchParam("variant", "or-rose__inexistant");
			render(
				<ColorSelector
					combos={[createCombo({ comboKey: "argent", label: "Argent" })]}
					product={createProduct()}
				/>,
			);
			// Aucun combo sélectionné mais pas de crash.
			expect(screen.getByRole("radio")).toHaveAttribute("aria-checked", "false");
			expect(screen.queryByText("Réinitialiser")).not.toBeInTheDocument();
		});
	});

	/**
	 * @regression color-selector-aria-busy-reset-2026-05-24
	 * F1 — Le bouton "Réinitialiser" devait recevoir `opacity-70` pendant la
	 * transition via `group-has-[[data-pending]]/color:opacity-70`. Bug
	 * d'origine : le sélecteur cherchait un descendant avec `data-pending`,
	 * mais l'attribut était sur le `<fieldset>` lui-même (pas un descendant)
	 * → la classe ne se déclenchait jamais. Fix : `aria-busy` direct sur le
	 * bouton Reset + classe Tailwind `aria-busy:opacity-70`.
	 */
	describe("@regression aria-busy reset button", () => {
		it("reset button includes aria-busy:opacity-70 in its className", () => {
			setSearchParam("variant", "rouge");
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			const reset = screen.getByText("Réinitialiser");
			expect(reset.className).toContain("aria-busy:opacity-70");
		});

		it("reset button does NOT rely on group-has-data-pending Tailwind selector", () => {
			setSearchParam("variant", "rouge");
			render(
				<ColorSelector combos={[createCombo({ comboKey: "rouge" })]} product={createProduct()} />,
			);
			const reset = screen.getByText("Réinitialiser");
			// L'ancienne classe `group-has-[[data-pending]]/color:opacity-70` ne
			// matchait jamais (fieldset ≠ descendant de lui-même). Vérifie qu'elle
			// est bien retirée.
			expect(reset.className).not.toContain("group-has-");
		});
	});
});
