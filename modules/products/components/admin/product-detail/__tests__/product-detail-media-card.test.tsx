import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	Images: () => <svg data-testid="icon-images" />,
	ImageOff: () => <svg data-testid="icon-image-off" />,
	ImagePlus: () => <svg data-testid="icon-image-plus" />,
}));

vi.mock("next/image", () => ({
	default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="next-image" {...rest} />
	),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
		<div data-testid="card" data-vt={style?.viewTransitionName}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button type="button">{children}</button>),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => () => {},
}));

vi.mock("@/shared/hooks/use-lightbox", () => ({
	useLightbox: () => ({ isOpen: false, open: () => {}, close: () => {} }),
}));

vi.mock("@/modules/media/services/lightbox-builder.service", () => ({
	buildLightboxSlides: () => [],
}));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

import { ProductDetailMediaCard } from "../product-detail-media-card";

type SkuInput = {
	isDefault: boolean;
	images: unknown[];
	colors?: Array<{ colorId: string; color: { name: string; hex: string } }>;
	materials?: Array<{ material: { name: string } }>;
	size?: string | null;
	sku?: string;
};

const makeProduct = (skus: Array<SkuInput>) =>
	({
		id: "p-1",
		slug: "anneau-lune",
		title: "Anneau Lune",
		description: null,
		status: "PUBLIC" as const,
		createdAt: new Date(),
		updatedAt: new Date(),
		type: null,
		skus: skus.map((s, i) => ({
			id: `sku-${i}`,
			sku: s.sku ?? `SKU-${i}`,
			isDefault: s.isDefault,
			images: s.images,
			colors: s.colors ?? [],
			materials: s.materials ?? [],
			size: s.size ?? null,
		})),
		collections: [],
	}) as any;

describe("ProductDetailMediaCard", () => {
	afterEach(cleanup);

	it("affiche le placeholder quand aucun SKU", () => {
		render(<ProductDetailMediaCard product={makeProduct([])} />);
		expect(screen.getByTestId("icon-image-off")).toBeInTheDocument();
		expect(screen.getByText("Aucun média")).toBeInTheDocument();
	});

	it("affiche le placeholder quand SKU sans image", () => {
		const product = makeProduct([{ isDefault: true, images: [] }]);
		render(<ProductDetailMediaCard product={product} />);
		expect(screen.getByText("Aucun média")).toBeInTheDocument();
	});

	it("affiche l'image principale du SKU par défaut en priorité", () => {
		const product = makeProduct([
			{
				isDefault: true,
				images: [
					{
						id: "i-1",
						url: "https://cdn/primary.jpg",
						thumbnailUrl: "https://cdn/primary-thumb.jpg",
						blurDataUrl: null,
						altText: "Image principale",
						mediaType: "IMAGE",
						isPrimary: true,
					},
				],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		const images = screen.getAllByTestId("next-image");
		expect(images[0]).toHaveAttribute("src", "https://cdn/primary.jpg");
		expect(images[0]).toHaveAttribute("alt", "Image principale");
	});

	it("met l'image isPrimary en tête puis affiche le reste en secondaire", () => {
		const product = makeProduct([
			{
				isDefault: true,
				images: [
					{
						id: "i-1",
						url: "https://cdn/a.jpg",
						thumbnailUrl: null,
						blurDataUrl: null,
						altText: null,
						mediaType: "IMAGE",
						isPrimary: false,
					},
					{
						id: "i-2",
						url: "https://cdn/b.jpg",
						thumbnailUrl: "https://cdn/b-thumb.jpg",
						blurDataUrl: null,
						altText: null,
						mediaType: "IMAGE",
						isPrimary: true,
					},
				],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		const images = screen.getAllByTestId("next-image");
		// Primary en premier (rendu hors des galeries)
		expect(images[0]).toHaveAttribute("src", "https://cdn/b.jpg");
		// Toutes les URLs doivent apparaître au moins une fois
		const urls = images.map((img) => img.getAttribute("src"));
		expect(urls).toContain("https://cdn/b.jpg");
		expect(urls.some((u) => u === "https://cdn/a.jpg")).toBe(true);
	});

	it("utilise le premier SKU si aucun n'est isDefault", () => {
		const product = makeProduct([
			{
				isDefault: false,
				images: [
					{
						id: "i-1",
						url: "https://cdn/x.jpg",
						thumbnailUrl: null,
						blurDataUrl: null,
						altText: null,
						mediaType: "IMAGE",
						isPrimary: false,
					},
				],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		const images = screen.getAllByTestId("next-image");
		expect(images[0]).toHaveAttribute("src", "https://cdn/x.jpg");
	});

	const img = (id: string, url: string, isPrimary = true) => ({
		id,
		url,
		thumbnailUrl: null,
		blurDataUrl: null,
		altText: null,
		mediaType: "IMAGE",
		isPrimary,
	});

	it("n'affiche pas le sélecteur de variante s'il n'y a qu'un seul SKU avec images", () => {
		const product = makeProduct([{ isDefault: true, images: [img("i-1", "https://cdn/a.jpg")] }]);
		render(<ProductDetailMediaCard product={product} />);
		expect(
			screen.queryByRole("group", { name: /Choisir la variante à prévisualiser/i }),
		).not.toBeInTheDocument();
	});

	it("affiche un sélecteur de variante quand ≥ 2 SKU ont des images", () => {
		const product = makeProduct([
			{
				isDefault: true,
				images: [img("i-1", "https://cdn/or.jpg")],
				colors: [{ colorId: "c-or", color: { name: "Or", hex: "#FFD700" } }],
			},
			{
				isDefault: false,
				images: [img("i-2", "https://cdn/argent.jpg")],
				colors: [{ colorId: "c-arg", color: { name: "Argent", hex: "#C0C0C0" } }],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		const group = screen.getByRole("group", { name: /Choisir la variante à prévisualiser/i });
		expect(group).toBeInTheDocument();
		// Le SKU par défaut (Or) est sélectionné → son image principale est affichée
		expect(screen.getAllByTestId("next-image")[0]).toHaveAttribute("src", "https://cdn/or.jpg");
	});

	it("bascule la galerie sur le SKU sélectionné au clic", () => {
		const product = makeProduct([
			{
				isDefault: true,
				images: [img("i-1", "https://cdn/or.jpg")],
				colors: [{ colorId: "c-or", color: { name: "Or", hex: "#FFD700" } }],
			},
			{
				isDefault: false,
				images: [img("i-2", "https://cdn/argent.jpg")],
				colors: [{ colorId: "c-arg", color: { name: "Argent", hex: "#C0C0C0" } }],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		fireEvent.click(screen.getByRole("button", { name: /Variante : Argent/i }));
		expect(screen.getAllByTestId("next-image")[0]).toHaveAttribute("src", "https://cdn/argent.jpg");
	});

	it("ignore les SKU sans image dans le sélecteur", () => {
		const product = makeProduct([
			{
				isDefault: true,
				images: [img("i-1", "https://cdn/or.jpg")],
				colors: [{ colorId: "c-or", color: { name: "Or", hex: "#FFD700" } }],
			},
			{
				isDefault: false,
				images: [],
				colors: [{ colorId: "c-x", color: { name: "Vide", hex: "#000" } }],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		// Un seul SKU a des images → pas de sélecteur
		expect(
			screen.queryByRole("group", { name: /Choisir la variante à prévisualiser/i }),
		).not.toBeInTheDocument();
	});

	it("alt fallback sur le titre si altText absent pour l'image principale", () => {
		const product = makeProduct([
			{
				isDefault: true,
				images: [
					{
						id: "i-1",
						url: "https://cdn/p.jpg",
						thumbnailUrl: null,
						blurDataUrl: null,
						altText: null,
						mediaType: "IMAGE",
						isPrimary: true,
					},
				],
			},
		]);
		render(<ProductDetailMediaCard product={product} />);
		const images = screen.getAllByTestId("next-image");
		expect(images[0]).toHaveAttribute("alt", "Anneau Lune");
	});
});
