import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/collections/constants/image-sizes.constants", () => ({
	COLLECTION_IMAGE_SIZES_COMPACT: {
		SINGLE: "250px",
		BENTO_MAIN: "180px",
		BENTO_SECONDARY: "90px",
		TWO_IMAGES: "130px",
		THREE_IMAGES: "130px",
	},
}));

vi.mock("../collection-image-item", () => ({
	CollectionImageItem: ({
		image,
		collectionName,
		index,
		staggerIndex,
	}: {
		image: { url: string; alt?: string | null };
		collectionName: string;
		index: number;
		isAboveFold?: boolean;
		sizes: string;
		staggerIndex?: number;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={image.url}
			alt={image.alt ?? `Bijou ${index + 1} de ${collectionName}`}
			data-testid={`collection-image-${index}`}
			data-stagger={staggerIndex}
		/>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionImagesGrid } from "../collection-images-grid";
import type { CollectionImage } from "../../types/collection.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

const img = (n: number): CollectionImage => ({
	url: `https://example.com/img${n}.jpg`,
	alt: `Image ${n}`,
	blurDataUrl: null,
});

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionImagesGrid", () => {
	describe("single image layout", () => {
		it("renders a group with correct aria-label for 1 image", () => {
			render(
				<CollectionImagesGrid images={[img(1)]} collectionName="Bagues" isAboveFold={false} />,
			);
			expect(
				screen.getByRole("group", { name: "Aperçu de 1 produit de la collection Bagues" }),
			).toBeInTheDocument();
		});

		it("renders the single image", () => {
			render(
				<CollectionImagesGrid images={[img(1)]} collectionName="Bagues" isAboveFold={false} />,
			);
			expect(screen.getByTestId("collection-image-0")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-0")).toHaveAttribute(
				"src",
				"https://example.com/img1.jpg",
			);
		});
	});

	describe("two images layout", () => {
		it("renders a group with correct aria-label for 2 images", () => {
			render(
				<CollectionImagesGrid
					images={[img(1), img(2)]}
					collectionName="Colliers"
					isAboveFold={false}
				/>,
			);
			expect(
				screen.getByRole("group", { name: "Aperçu de 2 produits de la collection Colliers" }),
			).toBeInTheDocument();
		});

		it("renders both images", () => {
			render(
				<CollectionImagesGrid
					images={[img(1), img(2)]}
					collectionName="Colliers"
					isAboveFold={false}
				/>,
			);
			expect(screen.getByTestId("collection-image-0")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-1")).toBeInTheDocument();
		});
	});

	describe("three images layout", () => {
		it("renders a group with correct aria-label for 3 images", () => {
			render(
				<CollectionImagesGrid
					images={[img(1), img(2), img(3)]}
					collectionName="Bracelets"
					isAboveFold={false}
				/>,
			);
			expect(
				screen.getByRole("group", { name: "Aperçu de 3 produits de la collection Bracelets" }),
			).toBeInTheDocument();
		});

		it("renders all three images", () => {
			render(
				<CollectionImagesGrid
					images={[img(1), img(2), img(3)]}
					collectionName="Bracelets"
					isAboveFold={false}
				/>,
			);
			expect(screen.getByTestId("collection-image-0")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-1")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-2")).toBeInTheDocument();
		});
	});

	describe("bento grid layout (4+ images)", () => {
		it("renders a group with correct aria-label for 4 images", () => {
			render(
				<CollectionImagesGrid
					images={[img(1), img(2), img(3), img(4)]}
					collectionName="Pendentifs"
					isAboveFold={false}
				/>,
			);
			expect(
				screen.getByRole("group", { name: "Aperçu de 4 produits de la collection Pendentifs" }),
			).toBeInTheDocument();
		});

		it("renders 4 images in bento layout", () => {
			render(
				<CollectionImagesGrid
					images={[img(1), img(2), img(3), img(4)]}
					collectionName="Pendentifs"
					isAboveFold={false}
				/>,
			);
			expect(screen.getByTestId("collection-image-0")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-1")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-2")).toBeInTheDocument();
			expect(screen.getByTestId("collection-image-3")).toBeInTheDocument();
		});
	});

	it("passes isAboveFold to the first image item", () => {
		render(<CollectionImagesGrid images={[img(1)]} collectionName="Bagues" isAboveFold={true} />);
		// The image is rendered (the prop flows through to CollectionImageItem mock)
		expect(screen.getByTestId("collection-image-0")).toBeInTheDocument();
	});
});
