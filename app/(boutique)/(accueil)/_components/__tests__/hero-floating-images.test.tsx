import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const { useReducedMotionMock } = vi.hoisted(() => ({
	useReducedMotionMock: vi.fn<() => boolean | null>(() => false),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("motion/react", () => ({
	useReducedMotion: useReducedMotionMock,
	useScroll: vi.fn(() => ({ scrollYProgress: 0 })),
	useTransform: vi.fn(() => 0),
	useInView: vi.fn(() => true),
	motion: { div: "div" },
	m: { div: "div", a: "a" },
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string; [key: string]: unknown }) => (
		// biome-ignore lint/a11y/useAltText: test mock
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="floating-img" />
	),
}));

vi.mock("@/shared/hooks", () => ({
	useIsTouchDevice: vi.fn(() => false),
}));

import { HeroFloatingImages } from "../floating-images";
import type { HeroProductImage } from "../../_utils/extract-hero-images";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	useReducedMotionMock.mockReturnValue(false);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImages(count: number): HeroProductImage[] {
	return Array.from({ length: count }, (_, i) => ({
		url: `/img-${i}.jpg`,
		alt: `Alt ${i}`,
		slug: `product-${i}`,
		title: `Product ${i}`,
	}));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeroFloatingImages", () => {
	it("returns null when images array is empty", () => {
		const { container } = render(<HeroFloatingImages images={[]} />);
		expect(container.innerHTML).toBe("");
	});

	it("renders container with aria-hidden when images are provided", () => {
		const { container } = render(<HeroFloatingImages images={makeImages(4)} />);

		const wrapper = container.querySelector("[aria-hidden]");
		expect(wrapper).not.toBeNull();
		expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders with CSS containment for performance", () => {
		const { container } = render(<HeroFloatingImages images={makeImages(4)} />);

		const wrapper = container.querySelector("[aria-hidden]");
		expect(wrapper?.getAttribute("style")).toContain("contain");
	});

	it("renders up to 4 floating images", () => {
		const { container } = render(<HeroFloatingImages images={makeImages(4)} />);

		const images = container.querySelectorAll("[data-testid='floating-img']");
		expect(images.length).toBe(4);
	});

	it("is hidden on mobile (md:block)", () => {
		const { container } = render(<HeroFloatingImages images={makeImages(4)} />);

		const wrapper = container.querySelector("[aria-hidden]");
		expect(wrapper?.className).toContain("hidden");
		expect(wrapper?.className).toContain("md:block");
	});
});
