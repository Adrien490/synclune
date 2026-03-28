import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/hooks", () => ({
	useLightbox: () => ({ isOpen: false, open: vi.fn(), close: vi.fn() }),
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		onLoad,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		onLoad?: () => void;
	}) => <img src={src} alt={alt} onLoad={onLoad} />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/media/components/media-lightbox", () => ({
	default: () => <div data-testid="media-lightbox" />,
}));

vi.mock("next/dynamic", () => ({
	default: () => () => <div data-testid="media-lightbox" />,
}));

import { ReviewCardGallery } from "../review-card-gallery";

// ============================================================================
// HELPERS
// ============================================================================

interface ReviewMedia {
	id: string;
	url: string;
	altText: string | null;
	blurDataUrl: string | null;
}

function createMedia(id: string): ReviewMedia {
	return {
		id,
		url: `https://example.com/photo-${id}.jpg`,
		altText: `Photo ${id}`,
		blurDataUrl: null,
	};
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewCardGallery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a button for each media", () => {
		render(<ReviewCardGallery medias={[createMedia("1"), createMedia("2")]} />);
		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBe(2);
	});

	it("renders aria-label for each photo button", () => {
		render(<ReviewCardGallery medias={[createMedia("1")]} />);
		expect(screen.getByRole("button", { name: "Voir la photo 1 de l'avis" })).toBeInTheDocument();
	});

	it("renders images with correct src and alt", () => {
		render(<ReviewCardGallery medias={[createMedia("1")]} />);
		const img = screen.getByRole("img");
		expect(img).toHaveAttribute("src", "https://example.com/photo-1.jpg");
		expect(img).toHaveAttribute("alt", "Photo 1");
	});

	it("renders fallback alt text when altText is null", () => {
		render(
			<ReviewCardGallery
				medias={[{ id: "1", url: "https://example.com/p.jpg", altText: null, blurDataUrl: null }]}
			/>,
		);
		const img = screen.getByRole("img");
		expect(img).toHaveAttribute("alt", "Photo 1");
	});

	it("does not render lightbox when not open", () => {
		render(<ReviewCardGallery medias={[createMedia("1")]} />);
		expect(screen.queryByTestId("media-lightbox")).toBeNull();
	});

	it("renders multiple photos without error", () => {
		render(<ReviewCardGallery medias={[createMedia("1"), createMedia("2"), createMedia("3")]} />);
		expect(screen.getAllByRole("button").length).toBe(3);
	});
});
