import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	useReducedMotion: vi.fn(() => false),
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		blurDataURL,
		...props
	}: {
		src: string;
		alt: string;
		blurDataURL?: string;
		[key: string]: unknown;
		// eslint-disable-next-line @next/next/no-img-element
	}) => <img src={src} alt={alt} data-blur-data-url={blurDataURL} {...props} />,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/modules/media/constants/image-config.constants", () => ({
	GALLERY_MAIN_SIZES: "(max-width: 768px) 100vw, 50vw",
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { GalleryHoverZoom } from "../hover-zoom";

// ============================================================================
// GalleryHoverZoom
// ============================================================================

describe("GalleryHoverZoom", () => {
	afterEach(cleanup);

	it("renders image with alt text", () => {
		render(<GalleryHoverZoom src="/test.jpg" alt="Test image" />);
		expect(screen.getByAltText("Test image")).toBeInTheDocument();
	});

	it("disabled mode renders without zoom container classes", () => {
		const { container } = render(
			<GalleryHoverZoom src="/test.jpg" alt="No zoom" enabled={false} />,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).not.toContain("overflow-hidden");
		expect(wrapper.className).not.toContain("cursor-crosshair");
	});

	it("enabled mode has overflow-hidden class", () => {
		const { container } = render(
			<GalleryHoverZoom src="/test.jpg" alt="Zoom enabled" enabled={true} />,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("overflow-hidden");
	});

	it("image has correct src and alt props", () => {
		render(<GalleryHoverZoom src="/product.jpg" alt="Product" />);
		const img = screen.getByAltText("Product") as HTMLImageElement;
		expect(img.src).toContain("/product.jpg");
		expect(img.alt).toBe("Product");
	});

	it("passes blurDataUrl as blurDataURL prop when provided", () => {
		const blur = "data:image/jpeg;base64,abc123";
		render(<GalleryHoverZoom src="/test.jpg" alt="Blur test" blurDataUrl={blur} />);
		const img = screen.getByAltText("Blur test");
		expect(img).toHaveAttribute("data-blur-data-url", blur);
	});

	it("enabled mode has cursor-crosshair class", () => {
		const { container } = render(
			<GalleryHoverZoom src="/test.jpg" alt="Cursor test" enabled={true} />,
		);
		const wrapper = container.firstChild as HTMLElement;
		expect(wrapper.className).toContain("cursor-crosshair");
	});
});
