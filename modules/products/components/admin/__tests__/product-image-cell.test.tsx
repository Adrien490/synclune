import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within, waitFor } from "@testing-library/react";
import { ProductImageCell } from "../product-image-cell";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const { mockOpen, mockClose, mockIsOpen } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockClose: vi.fn(),
	mockIsOpen: { value: false },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/hooks", () => ({
	useLightbox: () => ({
		get isOpen() {
			return mockIsOpen.value;
		},
		open: mockOpen,
		close: mockClose,
	}),
}));

vi.mock("@/modules/media/components/media-lightbox", () => ({
	default: ({ open }: { open: boolean }) => (open ? <div data-testid="media-lightbox" /> : null),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	PackageIcon: ({
		className,
		"aria-hidden": ariaHidden,
	}: {
		className?: string;
		"aria-hidden"?: boolean | "true" | "false";
	}) => <svg data-testid="package-icon" className={className} aria-hidden={ariaHidden} />,
}));

// `useReducedMotion` (motion/react) lit matchMedia, absent de jsdom.
vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
// Plus de `isPrimary` : l'ordre du tableau EST l'ordre canonique (position, id)
const baseImage = {
	id: "img-a",
	url: "https://example.com/a.jpg",
	thumbnailUrl: null,
	blurDataUrl: null,
	altText: "Image A",
	mediaType: "IMAGE" as const,
	width: null,
	height: null,
};

const imageA = baseImage;

const imageB = {
	...baseImage,
	id: "img-b",
	url: "https://example.com/b.jpg",
	altText: "Image B",
};

const videoRankZero = {
	...baseImage,
	id: "vid-1",
	url: "https://example.com/clip.mp4",
	altText: "Vidéo",
	mediaType: "VIDEO" as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ProductImageCell", () => {
	beforeEach(() => {
		mockOpen.mockClear();
		mockClose.mockClear();
		mockIsOpen.value = false;
	});

	afterEach(() => {
		cleanup();
	});

	// Rendering
	it("affiche l'image principale quand des images sont fournies", () => {
		render(<ProductImageCell images={[imageA]} productTitle="Bague dorée" />);
		expect(screen.getByAltText("Image A")).toBeInTheDocument();
	});

	it("affiche l'état vide avec l'icône Package quand aucune image", () => {
		render(<ProductImageCell images={[]} productTitle="Bague dorée" />);
		expect(screen.getByTestId("package-icon")).toBeInTheDocument();
		expect(screen.queryByRole("img", { name: "Bague dorée" })).not.toBeInTheDocument();
	});

	it("affiche la première IMAGE de l'ordre du tableau comme vignette", () => {
		const { container } = render(
			<ProductImageCell images={[imageA, imageB]} productTitle="Bague dorée" />,
		);
		// Seule la première image est rendue en vignette, pas la seconde
		expect(within(container).getByAltText("Image A")).toBeInTheDocument();
		expect(within(container).queryByAltText("Image B")).not.toBeInTheDocument();
	});

	// pickPrimaryImage (SSOT) : une vidéo ne doit JAMAIS atteindre `<Image src>` —
	// prendre `images[0]` sans filtre mettait un `.mp4` dans l'optimiseur
	// (vignette cassée + transformation facturée).
	it("retombe sur la première IMAGE quand le média au rang 0 est une vidéo", () => {
		const { container } = render(
			<ProductImageCell images={[videoRankZero, imageA]} productTitle="Bague dorée" />,
		);
		expect(within(container).getByAltText("Image A")).toBeInTheDocument();
		expect(within(container).queryByAltText("Vidéo")).not.toBeInTheDocument();
	});

	it("affiche l'état vide quand le produit n'a QUE des vidéos", () => {
		render(<ProductImageCell images={[videoRankZero]} productTitle="Bague dorée" />);
		expect(screen.getByTestId("package-icon")).toBeInTheDocument();
	});

	// Accessibility
	it("le bouton a le bon aria-label avec le titre du produit", () => {
		render(<ProductImageCell images={[imageA]} productTitle="Bague dorée" />);
		expect(
			screen.getByRole("button", { name: "Voir les images de Bague dorée" }),
		).toBeInTheDocument();
	});

	it("l'état vide a role='img' et aria-label 'Aucune image disponible'", () => {
		render(<ProductImageCell images={[]} productTitle="Bague dorée" />);
		expect(screen.getByRole("img", { name: "Aucune image disponible" })).toBeInTheDocument();
	});

	// Lightbox
	it("appelle open() au clic sur le bouton image", () => {
		render(<ProductImageCell images={[imageA]} productTitle="Bague dorée" />);
		fireEvent.click(screen.getByRole("button", { name: "Voir les images de Bague dorée" }));
		expect(mockOpen).toHaveBeenCalledTimes(1);
	});

	it("affiche le composant MediaLightbox quand isOpen est true", async () => {
		mockIsOpen.value = true;
		render(<ProductImageCell images={[imageA]} productTitle="Bague dorée" />);
		// Lazy import resolves asynchronously even when mocked — wait for Suspense to settle
		await waitFor(() => {
			expect(screen.getByTestId("media-lightbox")).toBeInTheDocument();
		});
	});
});
