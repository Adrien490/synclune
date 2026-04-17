import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill,
		className,
		sizes,
		priority,
		placeholder,
		blurDataURL,
		quality,
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		className?: string;
		sizes?: string;
		priority?: boolean;
		placeholder?: string;
		blurDataURL?: string;
		quality?: number;
	}) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt={alt}
			data-fill={fill ? "true" : undefined}
			className={className}
			data-sizes={sizes}
			data-priority={priority ? "true" : undefined}
			data-placeholder={placeholder}
			data-blur-url={blurDataURL}
			data-quality={quality}
			data-testid="collection-image"
		/>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/collections/constants/image-sizes.constants", () => ({
	COLLECTION_IMAGE_QUALITY: 85,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CollectionImageItem } from "../collection-image-item";
import type { CollectionImage } from "../../types/collection.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function makeImage(overrides: Partial<CollectionImage> = {}): CollectionImage {
	return {
		url: "https://example.com/bague.jpg",
		alt: "Bague artisanale",
		blurDataUrl: null,
		...overrides,
	};
}

function renderItem(overrides: Partial<React.ComponentProps<typeof CollectionImageItem>> = {}) {
	const props = {
		image: makeImage(),
		collectionName: "Bagues",
		index: 0,
		isAboveFold: false,
		sizes: "(max-width: 640px) 50vw, 25vw",
		staggerIndex: 0,
		...overrides,
	};
	return render(<CollectionImageItem {...props} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe("CollectionImageItem", () => {
	it("renders the image with the provided src", () => {
		renderItem();
		const image = screen.getByTestId("collection-image");
		expect(image).toHaveAttribute("src", "https://example.com/bague.jpg");
	});

	it("uses provided alt text when available", () => {
		renderItem({ image: makeImage({ alt: "Bague en or" }) });
		expect(screen.getByAltText("Bague en or")).toBeInTheDocument();
	});

	it("generates contextual alt text when alt is null", () => {
		renderItem({ image: makeImage({ alt: null }), index: 2, collectionName: "Colliers" });
		expect(screen.getByAltText("Bijou artisanal 3 de la collection Colliers")).toBeInTheDocument();
	});

	it("uses primary quality (85) for the first image (index=0)", () => {
		renderItem({ index: 0 });
		expect(screen.getByTestId("collection-image")).toHaveAttribute("data-quality", "85");
	});

	it("uses secondary quality (75) for non-primary images (index>0)", () => {
		renderItem({ index: 1 });
		expect(screen.getByTestId("collection-image")).toHaveAttribute("data-quality", "75");
	});

	it("sets priority=true when isAboveFold is true", () => {
		renderItem({ isAboveFold: true });
		expect(screen.getByTestId("collection-image")).toHaveAttribute("data-priority", "true");
	});

	it("does not set priority when isAboveFold is false", () => {
		renderItem({ isAboveFold: false });
		expect(screen.getByTestId("collection-image")).not.toHaveAttribute("data-priority");
	});

	it("passes the sizes prop to the image", () => {
		renderItem({ sizes: "(max-width: 375px) 100vw, 50vw" });
		expect(screen.getByTestId("collection-image")).toHaveAttribute(
			"data-sizes",
			"(max-width: 375px) 100vw, 50vw",
		);
	});

	it("uses 'blur' placeholder when blurDataUrl is provided", () => {
		renderItem({ image: makeImage({ blurDataUrl: "data:image/jpeg;base64,abc123" }) });
		expect(screen.getByTestId("collection-image")).toHaveAttribute("data-placeholder", "blur");
		expect(screen.getByTestId("collection-image")).toHaveAttribute(
			"data-blur-url",
			"data:image/jpeg;base64,abc123",
		);
	});

	it("uses 'empty' placeholder when no blurDataUrl is provided", () => {
		renderItem({ image: makeImage({ blurDataUrl: null }) });
		expect(screen.getByTestId("collection-image")).toHaveAttribute("data-placeholder", "empty");
	});

	it("applies stagger delay class based on staggerIndex", () => {
		renderItem({ staggerIndex: 1 });
		const image = screen.getByTestId("collection-image");
		// staggerIndex=1 → delay-[40ms] class should be included in className
		expect(image.className).toContain("delay-[40ms]");
	});

	it("applies fill prop to the image", () => {
		renderItem();
		expect(screen.getByTestId("collection-image")).toHaveAttribute("data-fill", "true");
	});
});
