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

vi.mock("lucide-react", () => ({
	Package: ({
		className,
		"aria-hidden": ariaHidden,
	}: {
		className?: string;
		"aria-hidden"?: boolean | "true" | "false";
	}) => <svg data-testid="package-icon" className={className} aria-hidden={ariaHidden} />,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const imageA: { url: string; blurDataUrl: null; altText: string; isPrimary: false } = {
	url: "https://example.com/a.jpg",
	blurDataUrl: null,
	altText: "Image A",
	isPrimary: false,
};

const imagePrimary: { url: string; blurDataUrl: null; altText: string; isPrimary: true } = {
	url: "https://example.com/primary.jpg",
	blurDataUrl: null,
	altText: "Image primaire",
	isPrimary: true,
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

	it("priorise l'image isPrimary sur la première image", () => {
		const { container } = render(
			<ProductImageCell images={[imageA, imagePrimary]} productTitle="Bague dorée" />,
		);
		// Only the primary image should be rendered, not imageA
		expect(within(container).getByAltText("Image primaire")).toBeInTheDocument();
		expect(within(container).queryByAltText("Image A")).not.toBeInTheDocument();
	});

	it("utilise la première image quand aucune isPrimary", () => {
		render(<ProductImageCell images={[imageA]} productTitle="Bague dorée" />);
		expect(screen.getByAltText("Image A")).toBeInTheDocument();
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
