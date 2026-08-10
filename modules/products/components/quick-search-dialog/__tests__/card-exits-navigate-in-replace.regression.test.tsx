/**
 * @regression qs-card-exits-navigate-in-replace
 *
 * Six sorties du panneau portaient `replace` sur leur `<Link>` — et un commentaire
 * disant « consomme l'entrée d'historique du dialog » — tout en naviguant en
 * `router.push`. Leur `onClick` appelle `event.preventDefault()`, or Next `<Link>`
 * sort AVANT de lire sa prop `replace` quand l'événement est `defaultPrevented` :
 * la prop n'était **jamais lue**, le commentaire décrivait un comportement
 * inexistant, et l'entrée poussée à l'ouverture par `useBackButtonClose` (même URL
 * que la page d'origine) restait enterrée sous la destination — une pression
 * Retour morte par cycle ouvrir→cliquer, cumulatif.
 *
 * `close-reclaims-history.regression.test.tsx` verrouillait déjà ce défaut, mais
 * uniquement pour `navigateToSearch` (Entrée / « Voir tous les résultats »). Les
 * six sorties « carte » n'avaient aucune couverture : elles mockent toutes leur
 * routeur, et un mock ne dit pas quelle méthode l'appelant AURAIT dû choisir.
 *
 * Ce test tient les six d'un coup, au niveau des composants feuilles.
 * Audit UI/UX 2026-08-05 (P1-2).
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted spies ───────────────────────────────────────────────────────────

const { mockPush, mockReplace } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockReplace: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: vi.fn() }),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		replace: _replace,
		prefetch: _prefetch,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
		replace?: boolean;
		prefetch?: boolean;
		[key: string]: unknown;
	}) => (
		<a href={href} onClick={onClick} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/stagger", () => ({
	Stagger: ({
		children,
		className,
		as: Container = "div",
		itemAs: ItemTag = "div",
	}: {
		children: React.ReactNode;
		className?: string;
		as?: "div" | "ul";
		itemAs?: "div" | "li";
	}) => (
		<Container className={className}>
			{React.Children.map(children, (child, index) => (
				<ItemTag key={index}>{child}</ItemTag>
			))}
		</Container>
	),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: (n: number) => `${(n / 100).toFixed(2)} €`,
}));

vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
		li: ({ children, className }: { children: React.ReactNode; className?: string }) => (
			<li className={className}>{children}</li>
		),
	},
}));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { CategoryCard } from "../category-card";
import { CollectionCard } from "../collection-card";
import { ColorWall } from "../color-wall";
import { IdleContent } from "../idle-content";
import { SearchResultItem } from "../search-result-item";
import type { QuickSearchCollection, QuickSearchColor, QuickSearchProductType } from "../constants";
import type { QuickSearchProduct } from "../../../data/quick-search-products";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const color: QuickSearchColor = { slug: "rose-poudre", name: "Rose poudré", hex: "#F0568F" };

const collection: QuickSearchCollection = {
	slug: "bagues",
	name: "Bagues",
	productCount: 12,
	image: null,
};

const productType: QuickSearchProductType = { slug: "colliers", label: "Colliers" };

const product: QuickSearchProduct = {
	id: "p1",
	slug: "bague-lune",
	title: "Bague Lune",
	skus: [
		{
			priceInclTax: 4500,
			compareAtPrice: null,
			inventory: 3,
			position: 0,
			colors: [],
			images: [],
		},
	],
};

const noop = () => {};

beforeEach(() => {
	vi.clearAllMocks();
});

afterEach(() => {
	cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Sorties « carte » du quick search — navigation en REPLACE, jamais en push", () => {
	it("une pastille du nuancier navigue en replace", async () => {
		const user = userEvent.setup();
		render(<ColorWall colors={[color]} onSelect={noop} />);

		await user.click(screen.getByRole("link"));

		expect(mockReplace).toHaveBeenCalledWith("/produits?color=rose-poudre");
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("une carte collection navigue en replace", async () => {
		const user = userEvent.setup();
		render(<CollectionCard collection={collection} onSelect={noop} />);

		await user.click(screen.getByRole("link"));

		expect(mockReplace).toHaveBeenCalledWith("/collections/bagues");
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("une carte catégorie navigue en replace", async () => {
		const user = userEvent.setup();
		render(<CategoryCard type={productType} onSelect={noop} />);

		await user.click(screen.getByRole("option"));

		expect(mockReplace).toHaveBeenCalledWith("/produits/colliers");
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("un résultat produit navigue en replace", async () => {
		const user = userEvent.setup();
		render(<SearchResultItem product={product} query="bague" onSelect={noop} />);

		await user.click(screen.getByRole("option"));

		expect(mockReplace).toHaveBeenCalledWith("/creations/bague-lune");
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("« Voir toutes les collections » navigue en replace", async () => {
		const user = userEvent.setup();
		render(
			<IdleContent
				searches={[]}
				collections={[collection]}
				colors={[]}
				onClose={noop}
				onRecentSearch={noop}
				onRemoveSearch={noop}
				onClearSearches={noop}
				isPending={false}
			/>,
		);

		await user.click(screen.getByRole("link", { name: /voir toutes les collections/i }));

		expect(mockReplace).toHaveBeenCalledWith("/collections");
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("« Voir tous les produits » navigue en replace", async () => {
		const user = userEvent.setup();
		render(
			<IdleContent
				searches={[]}
				collections={[]}
				colors={[]}
				onClose={noop}
				onRecentSearch={noop}
				onRemoveSearch={noop}
				onClearSearches={noop}
				isPending={false}
			/>,
		);

		await user.click(screen.getByRole("link", { name: /voir tous les produits/i }));

		expect(mockReplace).toHaveBeenCalledWith("/produits");
		expect(mockPush).not.toHaveBeenCalled();
	});
});
