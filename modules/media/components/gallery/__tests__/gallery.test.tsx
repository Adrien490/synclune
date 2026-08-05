import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: () => null,
	}),
}));

vi.mock("motion/react", () => ({
	useReducedMotion: () => false,
}));

vi.mock("embla-carousel-react", () => ({
	default: () => [vi.fn(), undefined],
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label?: string }) => (
		<div aria-label={label}>{children}</div>
	),
}));

vi.mock("@/modules/media/constants/gallery.constants", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		PREFETCH_RANGE_FAST: 2,
		PREFETCH_RANGE_SLOW: 1,
	};
});

vi.mock("@/modules/media/hooks/use-image-prefetch", () => ({
	usePrefetchImages: vi.fn(),
}));

vi.mock("@/modules/media/hooks/use-video-prefetch", () => ({
	usePrefetchVideos: vi.fn(),
}));

vi.mock("@/modules/media/schemas/gallery-params.schema", () => ({
	parseGalleryParams: (params: unknown) => params,
}));

vi.mock("@/modules/media/services/gallery-builder.service", () => ({
	buildGallery: vi.fn(),
}));

vi.mock("@/modules/media/services/lightbox-builder.service", () => ({
	buildLightboxSlides: vi.fn(() => []),
}));

vi.mock("@/shared/components/gallery/counter", () => ({
	GalleryCounter: ({ current, total }: { current: number; total: number }) => (
		<div data-testid="gallery-counter">
			{current + 1}/{total}
		</div>
	),
}));

vi.mock("@/shared/components/gallery/navigation", () => ({
	GalleryNavigation: ({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) => (
		<div data-testid="gallery-navigation">
			<button onClick={onPrev}>Prev</button>
			<button onClick={onNext}>Next</button>
		</div>
	),
}));

vi.mock("@/shared/components/gallery/zoom-button", () => ({
	GalleryZoomButton: ({ onOpen, mediaType }: { onOpen: () => void; mediaType?: string }) => (
		<button data-testid="gallery-zoom-button" data-media-type={mediaType} onClick={onOpen}>
			Zoom
		</button>
	),
}));

vi.mock("@/shared/hooks", async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		useLightbox: () => ({
			isOpen: false,
			open: vi.fn(),
			close: vi.fn(),
		}),
		useMediaQuery: () => false,
	};
});

vi.mock("@/modules/media/components/gallery/slide", async () => ({
	GallerySlide: ({ media, index }: { media: { id: string; url: string }; index: number }) => (
		<div data-testid={`gallery-slide-${index}`} data-media-id={media.id}>
			slide {index}
		</div>
	),
}));

vi.mock("@/modules/media/components/gallery/thumbnail", async () => ({
	GalleryThumbnail: ({
		media,
		index,
		isActive,
	}: {
		media: { id: string };
		index: number;
		isActive: boolean;
		[key: string]: unknown;
	}) => (
		<button
			role="tab"
			data-testid={`gallery-thumbnail-${index}`}
			aria-selected={isActive}
			data-media-id={media.id}
		>
			thumbnail {index}
		</button>
	),
}));

vi.mock("@/modules/media/components/media-lightbox", () => ({
	default: () => <div data-testid="media-lightbox" />,
}));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import { Gallery } from "../gallery";
import { buildGallery } from "@/modules/media/services/gallery-builder.service";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

// ============================================================================
// HELPERS
// ============================================================================

function createMedia(id: string, overrides: Partial<ProductMedia> = {}): ProductMedia {
	return {
		id,
		url: `https://example.com/${id}.jpg`,
		alt: `Media ${id}`,
		mediaType: "IMAGE",
		thumbnailUrl: null,
		blurDataUrl: null,
		...overrides,
	} as unknown as ProductMedia;
}

// Minimal product shape that satisfies Gallery props

function createProduct(overrides: Record<string, unknown> = {}): any {
	return {
		id: "prod-1",
		title: "Bague étoile",
		type: { label: "Bijou" },
		skus: [],
		media: [],
		...overrides,
	};
}

// ============================================================================
// TESTS
// ============================================================================

beforeEach(() => {
	Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

describe("Gallery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("empty state", () => {
		it("renders 'Photos en préparation' when no images", () => {
			vi.mocked(buildGallery).mockReturnValue([]);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByText("Photos en préparation")).toBeInTheDocument();
		});

		it("renders the empty state paragraph", () => {
			vi.mocked(buildGallery).mockReturnValue([]);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByText("Un peu de patience !")).toBeInTheDocument();
		});

		it("renders a div with class gallery-empty", () => {
			vi.mocked(buildGallery).mockReturnValue([]);
			const { container } = render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(container.querySelector(".gallery-empty")).toBeInTheDocument();
		});
	});

	describe("with single image", () => {
		it("renders the main gallery slide", () => {
			const images = [createMedia("m-1")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-slide-0")).toBeInTheDocument();
		});

		it("renders a region with aria-label containing the title", () => {
			const images = [createMedia("m-1")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByRole("region", { name: /Bague étoile/ })).toBeInTheDocument();
		});

		it("does NOT render thumbnails for single image", () => {
			const images = [createMedia("m-1")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
		});

		it("does NOT render navigation arrows for single image", () => {
			const images = [createMedia("m-1")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.queryByTestId("gallery-navigation")).not.toBeInTheDocument();
		});
	});

	describe("with multiple images", () => {
		it("renders all slides", () => {
			const images = [createMedia("m-1"), createMedia("m-2"), createMedia("m-3")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-slide-0")).toBeInTheDocument();
			expect(screen.getByTestId("gallery-slide-1")).toBeInTheDocument();
			expect(screen.getByTestId("gallery-slide-2")).toBeInTheDocument();
		});

		it("renders a tablist for thumbnails", () => {
			const images = [createMedia("m-1"), createMedia("m-2")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			// Two tabulist (desktop + mobile)
			expect(screen.getAllByRole("tablist").length).toBeGreaterThanOrEqual(1);
		});

		it("renders navigation arrows", () => {
			const images = [createMedia("m-1"), createMedia("m-2")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-navigation")).toBeInTheDocument();
		});

		it("renders a counter", () => {
			const images = [createMedia("m-1"), createMedia("m-2")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-counter")).toBeInTheDocument();
		});
	});

	// La loupe était gatée sur `mediaType === "IMAGE"`. Sur un produit qui mélange
	// photos et vidéo, deux flèches droite depuis la loupe focalisée la démontaient
	// SOUS le focus : le focus retombait sur `<body>`, et comme le listener `keydown`
	// de la galerie est attaché à l'élément galerie, un événement émis sur `<body>`
	// ne remonte plus jusqu'à lui — flèches, Home et End mouraient en silence.
	describe("la loupe ne se démonte jamais sous le focus", () => {
		it("reste montée quand le média courant est une vidéo", () => {
			const images = [createMedia("m-1", { mediaType: "VIDEO" }), createMedia("m-2")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-zoom-button")).toBeInTheDocument();
		});

		it("annonce le type du média courant, seule chose qui change", () => {
			vi.mocked(buildGallery).mockReturnValue([createMedia("m-1", { mediaType: "VIDEO" })]);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-zoom-button")).toHaveAttribute("data-media-type", "VIDEO");

			cleanup();

			vi.mocked(buildGallery).mockReturnValue([createMedia("m-1")]);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			expect(screen.getByTestId("gallery-zoom-button")).toHaveAttribute("data-media-type", "IMAGE");
		});
	});

	describe("screen reader status", () => {
		it("renders sr-only status message", () => {
			const images = [createMedia("m-1"), createMedia("m-2")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status.textContent).toContain("Image 1 sur 2");
		});

		// Le libellé suit le TYPE du média courant, comme `media-lightbox.tsx` le fait
		// déjà de son côté. Sans ça, la 3ᵉ vue d'un `[IMAGE, IMAGE, VIDÉO]` s'annonçait
		// « Image 3 sur 3 » pendant que le plein écran ouvert depuis cette même vue
		// disait « Vidéo 3 sur 3 » : une galerie, deux vocabulaires.
		it("annonce « Vidéo » quand le média courant en est une", () => {
			vi.mocked(buildGallery).mockReturnValue([createMedia("m-1", { mediaType: "VIDEO" })]);
			render(<Gallery product={createProduct()} title="Bague étoile" />);

			expect(screen.getByRole("status").textContent).toContain("Vidéo 1 sur 1");
		});
	});

	describe("aria-roledescription", () => {
		it("has aria-roledescription=carrousel on the region", () => {
			const images = [createMedia("m-1")];
			vi.mocked(buildGallery).mockReturnValue(images);
			render(<Gallery product={createProduct()} title="Bague étoile" />);
			const region = screen.getByRole("region", { name: /Bague étoile/ });
			expect(region).toHaveAttribute("aria-roledescription", "carrousel");
		});
	});

	describe("mobile thumbnail safe-area (P1.1)", () => {
		it("applies safe-area insets on mobile thumbnail scroll container", () => {
			const images = [createMedia("m-1"), createMedia("m-2")];
			vi.mocked(buildGallery).mockReturnValue(images);
			const { container } = render(<Gallery product={createProduct()} title="Bague étoile" />);
			// Find mobile tablist wrapper — the one inside md:hidden wrapper
			const mobileTablist = container.querySelector(
				'[role="tablist"][aria-label="Vignettes du produit"].pl-\\[env\\(safe-area-inset-left\\,0px\\)\\]',
			);
			expect(mobileTablist).toBeInTheDocument();
		});
	});
});
