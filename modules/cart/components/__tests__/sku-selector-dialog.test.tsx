import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsOpen, mockDialogData, mockClose } = vi.hoisted(() => ({
	mockIsOpen: { value: false },
	mockDialogData: { value: null as Record<string, unknown> | null },
	mockClose: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/overlay-store-provider", () => ({
	useDialog: () => ({
		isOpen: mockIsOpen.value,
		data: mockDialogData.value,
		close: mockClose,
	}),
}));

vi.mock("@/modules/cart/hooks/use-add-to-cart", () => ({
	useAddToCart: () => ({ state: undefined, action: vi.fn(), isPending: false }),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
		open ? <div data-testid="responsive-dialog">{children}</div> : null,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-content">{children}</div>
	),
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="dialog-title">{children}</h2>
	),
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p data-testid="dialog-description">{children}</p>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="dialog-footer">{children}</div>
	),
}));

vi.mock("next/image", () => ({
	// eslint-disable-next-line @next/next/no-img-element
	default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("next/dynamic", () => ({
	default: () => () => <div data-testid="size-guide" />,
}));

vi.mock("motion/react", () => ({
	m: {
		span: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
			<span className={className}>{children}</span>
		),
	},
	useReducedMotion: () => false,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ArrowRightIcon: () => <svg data-testid="icon-arrow-right" />,
	MinusIcon: () => <svg data-testid="icon-minus" />,
	PlusIcon: () => <svg data-testid="icon-plus" />,
	WarningIcon: () => <svg data-testid="icon-warning" />,
	XCircleIcon: () => <svg data-testid="icon-x-circle" />,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
	useHaptic: () => vi.fn(),
}));

vi.mock("@/modules/products/services/product-display.service", () => ({
	getPrimaryImageForList: () => ({
		url: "https://example.com/photo.jpg",
		alt: "Photo produit",
		blurDataUrl: null,
	}),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { SkuSelectorDialog } from "../sku-selector-dialog";
import { makeCart, makeProduct, makeSku } from "./sku-selector-fixtures";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SkuSelectorDialog", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsOpen.value = false;
		mockDialogData.value = null;
	});

	function open(product = makeProduct()) {
		mockIsOpen.value = true;
		mockDialogData.value = { product, preselectedColor: null };
	}

	it("ne rend rien quand le dialog est fermé", () => {
		const { container } = render(<SkuSelectorDialog cart={makeCart()} />);
		expect(container.firstChild).toBeNull();
	});

	it("ne rend rien quand le store est ouvert sans produit", () => {
		// L'ancien squelette de 48 lignes vivait derrière cette condition —
		// `openSkuSelector({ product })` pose les deux ensemble, elle est inatteignable.
		mockIsOpen.value = true;
		mockDialogData.value = null;
		const { container } = render(<SkuSelectorDialog cart={makeCart()} />);
		expect(container.firstChild).toBeNull();
	});

	it("rend le titre du produit", () => {
		open();
		render(<SkuSelectorDialog cart={makeCart()} />);
		expect(screen.getByTestId("dialog-title")).toHaveTextContent("Bague Fleur de Cristal");
	});

	it("annonce le nombre de pièces réellement en vitrine, au tutoiement", () => {
		open();
		render(<SkuSelectorDialog cart={makeCart()} />);
		expect(screen.getByTestId("dialog-description")).toHaveTextContent(
			"Trois pièces existent en ce moment. Prends la tienne.",
		);
	});

	it("passe au singulier quand une seule pièce reste active", () => {
		open(makeProduct({ skus: [makeSku({ id: "sku-1" })] as never }));
		render(<SkuSelectorDialog cart={makeCart()} />);
		expect(screen.getByTestId("dialog-description")).toHaveTextContent(
			"Une seule pièce existe en ce moment.",
		);
	});

	it("dit « Tout est parti » quand plus rien n'est en stock, sans masquer les pièces", () => {
		open(
			makeProduct({
				skus: [
					makeSku({ id: "sku-1", inventory: 0, size: "52" }),
					makeSku({ id: "sku-2", inventory: 0, size: "54" }),
				] as never,
			}),
		);
		render(<SkuSelectorDialog cart={makeCart()} />);

		expect(screen.getByTestId("dialog-description")).toHaveTextContent(
			"Tout est parti pour le moment.",
		);
		// Les lignes restent visibles : on montre ce qui existe, on ne le cache pas.
		expect(screen.getAllByRole("radio")).toHaveLength(2);
		expect(screen.getByRole("button", { name: /Ajouter au panier/i })).toBeDisabled();
	});

	it("dessine la fermeture de la boutique AVANT le clic, et désactive le CTA", () => {
		open();
		render(
			<SkuSelectorDialog
				cart={makeCart()}
				isStoreClosed
				storeClosureMessage="Je suis en congés jusqu'au 20."
			/>,
		);

		expect(screen.getByText("Je suis en congés jusqu'au 20.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Ajouter au panier/i })).toBeDisabled();
	});

	it("retombe sur un message de fermeture tutoyé quand la boutique n'en fournit pas", () => {
		open();
		render(<SkuSelectorDialog cart={makeCart()} isStoreClosed storeClosureMessage={null} />);
		expect(
			screen.getByText("La boutique est fermée en ce moment — tu peux regarder, pas commander."),
		).toBeInTheDocument();
	});
});
