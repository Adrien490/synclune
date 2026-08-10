/**
 * @regression sku-selector-one-piece-per-sku
 *
 * Verrouille la direction « Une pièce à la fois » (audit design 2026-08-04) sur les
 * quatre propriétés qui ont une conséquence commerciale, pas esthétique :
 *
 * 1. **Une ligne par SKU actif.** C'est ce qui rend le cul-de-sac impossible : il n'y
 *    a plus de combinaison à former, chaque ligne EST une pièce qui existe.
 * 2. **La taille est écrite sur chaque ligne qui en a une.** Le P0 corrigé par
 *    ailleurs (`PRODUCT_TYPES_REQUIRING_SIZE` pointait `ring` quand la base dit
 *    `bagues`) ne peut plus produire d'achat silencieux même s'il revenait : aucune
 *    constante ne s'interpose entre le SKU et son libellé.
 * 3. **Le `skuId` posté suit la ligne choisie, et la quantité est clampée** sur
 *    `inventory − déjà au panier` — le serveur CUMULE.
 * 4. **`aria-disabled`, jamais `disabled`.** Un `<button disabled>` sortait tout le
 *    radiogroup de l'ordre de tabulation dès que la sélection devenait indisponible.
 */
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/responsive-dialog", () => ({
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
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	ArrowRightIcon: () => <svg data-testid="icon-arrow-right" />,
	MinusIcon: () => <svg data-testid="icon-minus" />,
	PlusIcon: () => <svg data-testid="icon-plus" />,
	WarningIcon: () => <svg data-testid="icon-warning" />,
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

import { SkuSelectorPieces } from "../sku-selector-pieces";
import { makeProduct, makeSku } from "./sku-selector-fixtures";

afterEach(cleanup);

function renderPieces(
	options: {
		product?: ReturnType<typeof makeProduct>;
		cartItems?: { skuId: string; quantity: number }[];
		isStoreClosed?: boolean;
	} = {},
) {
	const product = options.product ?? makeProduct();
	return render(
		<form>
			<SkuSelectorPieces
				product={product}
				activeSkus={product.skus.filter((sku) => sku.isActive)}
				cartItems={options.cartItems ?? []}
				preselectedColor={null}
				isPending={false}
				isStoreClosed={options.isStoreClosed ?? false}
				storeClosureMessage={null}
				onClose={vi.fn()}
			/>
		</form>,
	);
}

function hiddenValue(container: HTMLElement, name: string): string | null {
	return container.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value ?? null;
}

describe("@regression sku-selector-one-piece-per-sku", () => {
	it("rend exactement une ligne par SKU actif", () => {
		renderPieces();
		expect(screen.getAllByRole("radio")).toHaveLength(3);
	});

	it("écrit la taille sur CHAQUE ligne qui en a une", () => {
		// Le défaut d'origine : sans groupe Taille, « Bague Fleur de Cristal »
		// (Cristal/52, Cristal/54, Émeraude/54) partait toujours en 52.
		renderPieces();
		const radios = screen.getAllByRole("radio");

		expect(radios[0]).toHaveAccessibleName(expect.stringContaining("taille 52"));
		expect(radios[1]).toHaveAccessibleName(expect.stringContaining("taille 54"));
		expect(radios[2]).toHaveAccessibleName(expect.stringContaining("taille 54"));

		// Et visuellement, pas seulement pour les lecteurs d'écran.
		expect(within(radios[0]!).getByText(/taille 52/)).toBeInTheDocument();
	});

	it("pré-choisit la première pièce ajoutable et poste son skuId", () => {
		const { container } = renderPieces();
		expect(screen.getAllByRole("radio")[0]).toHaveAttribute("aria-checked", "true");
		expect(hiddenValue(container, "skuId")).toBe("sku-cristal-52");
	});

	it("saute une pièce en rupture à l'ouverture plutôt que de la mettre en avant", () => {
		const product = makeProduct();
		product.skus[0]!.inventory = 0;
		const { container } = renderPieces({ product });
		expect(hiddenValue(container, "skuId")).toBe("sku-cristal-54");
	});

	it("fait suivre le skuId posté à la ligne choisie", async () => {
		const user = userEvent.setup();
		const { container } = renderPieces();

		await user.click(screen.getAllByRole("radio")[2]!);

		expect(hiddenValue(container, "skuId")).toBe("sku-emeraude-54");
		expect(screen.getAllByRole("radio")[2]).toHaveAttribute("aria-checked", "true");
	});

	it("clampe la quantité postée sur ce qui reste à ajouter, panier déduit", async () => {
		const user = userEvent.setup();
		// Émeraude a 2 en stock, 1 est déjà au panier → il ne reste qu'une unité.
		const { container } = renderPieces({ cartItems: [{ skuId: "sku-emeraude-54", quantity: 1 }] });

		await user.click(screen.getAllByRole("radio")[2]!);

		expect(hiddenValue(container, "quantity")).toBe("1");
		expect(screen.getByRole("button", { name: "Augmenter la quantité" })).toBeDisabled();
	});

	it("bloque l'ajout — sans masquer la pièce — quand tout le stock est déjà au panier", async () => {
		const user = userEvent.setup();
		renderPieces({ cartItems: [{ skuId: "sku-emeraude-54", quantity: 2 }] });

		await user.click(screen.getAllByRole("radio")[2]!);

		expect(screen.getByText("tout est dans ton panier")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Ajouter au panier/i })).toBeDisabled();
		// Le sélecteur de quantité disparaît : il n'y a plus rien à doser.
		expect(screen.queryByRole("button", { name: "Augmenter la quantité" })).not.toBeInTheDocument();
	});

	it("marque une pièce épuisée en aria-disabled, JAMAIS en disabled", async () => {
		const user = userEvent.setup();
		const product = makeProduct();
		product.skus[2]!.inventory = 0;
		const { container } = renderPieces({ product });

		const soldOut = screen.getAllByRole("radio")[2]!;
		expect(soldOut).toHaveAttribute("aria-disabled", "true");
		expect(soldOut).not.toHaveAttribute("disabled");
		// Elle reste dans l'ordre de tabulation : un `disabled` faisait sortir TOUT le
		// radiogroup du tab order via `focusOption`.
		expect(container.querySelectorAll("[role=radio][disabled]")).toHaveLength(0);

		await user.click(soldOut);
		expect(hiddenValue(container, "skuId")).toBe("sku-cristal-52");
	});

	it("garde chaque pièce dans l'ordre de tabulation, épuisée comprise", async () => {
		const user = userEvent.setup();
		const product = makeProduct();
		product.skus[1]!.inventory = 0;
		renderPieces({ product });

		const radios = screen.getAllByRole("radio");
		radios[0]!.focus();
		await user.tab();

		// Pas de roving tabindex : chaque ligne est un tab stop, donc la pièce épuisée
		// est annoncée (WCAG 1.3.1) et aucune sélection ne peut faire sortir le groupe
		// entier de l'ordre de tabulation — c'était le défaut de la version `disabled`.
		expect(radios[1]).toHaveFocus();
		expect(radios[1]).toHaveAttribute("aria-disabled", "true");
	});

	it("déplace la sélection aux flèches, en sautant les pièces épuisées", async () => {
		const user = userEvent.setup();
		const product = makeProduct();
		product.skus[1]!.inventory = 0;
		const { container } = renderPieces({ product });

		screen.getAllByRole("radio")[0]!.focus();
		await user.keyboard("{ArrowDown}");

		// `focusOption` exclut `[aria-disabled="true"]` : la 2ᵉ pièce est passée.
		expect(hiddenValue(container, "skuId")).toBe("sku-emeraude-54");
		expect(screen.getAllByRole("radio")[2]).toHaveFocus();
	});

	it("annonce chaque pièce avec son prix et son stock", () => {
		renderPieces();
		expect(screen.getAllByRole("radio")[2]).toHaveAccessibleName(
			/^Émeraude · taille 54, 59,90.€, il n'en reste que 2$/,
		);
	});

	it("désactive l'ajout quand la boutique est fermée", () => {
		renderPieces({ isStoreClosed: true });
		expect(screen.getByRole("button", { name: /Ajouter au panier/i })).toBeDisabled();
	});

	it("garde « Ajouter au panier » dans le nom accessible du CTA (contrat E2E)", () => {
		renderPieces();
		expect(screen.getByRole("button", { name: /^Ajouter au panier · 54,90.€$/ })).toBeEnabled();
	});
});
