import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/constants/brand", () => ({
	BRAND: {
		name: "Synclune",
		tagline: "Créations uniques faites avec amour",
		logo: {
			url: "/logo.webp",
			alt: "Synclune — Créations artisanales faites main",
			blurDataURL: "data:image/svg+xml;base64,TESTBLUR",
		},
	},
}));

const triggerHapticMock = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => triggerHapticMock(...args),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@/shared/styles/fonts", () => ({
	fraunces: { className: "font-fraunces" },
}));

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill: _fill,
		className,
		sizes: _sizes,
		preload: _preload,
		quality,
		placeholder: _placeholder,
		blurDataURL,
		"aria-hidden": ariaHidden,
		...props
	}: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("img", {
			src,
			alt,
			className,
			"data-quality": quality,
			"data-blur": blurDataURL,
			"aria-hidden": ariaHidden,
			"data-testid": "logo-image",
			...props,
		});
	},
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
		"aria-label": ariaLabel,
		onClick,
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement(
			"a",
			{ href, className, "aria-label": ariaLabel, onClick, ...props },
			children,
		);
	},
}));

// Import AFTER mocks
import { Logo } from "../logo";

// ============================================================================
// SETUP
// ============================================================================

afterEach(() => {
	cleanup();
	triggerHapticMock.mockClear();
});

// ============================================================================
// TESTS
// ============================================================================

describe("Logo", () => {
	it("renders the logo image", () => {
		render(<Logo />);

		expect(screen.getByTestId("logo-image")).toBeInTheDocument();
	});

	it("renders the logo alt text when showText is false", () => {
		render(<Logo />);

		const img = screen.getByTestId("logo-image");
		expect(img).toHaveAttribute("alt", "Synclune — Créations artisanales faites main");
	});

	it("renders with a link when href is provided", () => {
		render(<Logo href="/" />);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/");
	});

	it("uses homepage aria-label when href is /", () => {
		render(<Logo href="/" />);

		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Synclune - Accueil");
	});

	it("uses admin aria-label when href is /admin", () => {
		render(<Logo href="/admin" />);

		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Synclune - Administration");
	});

	it("renders without a link when no href is provided", () => {
		render(<Logo />);

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("renders brand name text when showText is true", () => {
		render(<Logo showText />);

		expect(screen.getByText("Synclune")).toBeInTheDocument();
	});

	it("does not render brand name text when showText is false", () => {
		render(<Logo />);

		expect(screen.queryByText("Synclune")).not.toBeInTheDocument();
	});

	it("sets image as aria-hidden when showText is true", () => {
		render(<Logo showText />);

		expect(screen.getByTestId("logo-image")).toHaveAttribute("aria-hidden", "true");
	});

	it("renders with custom size applied as style dimensions", () => {
		const { container } = render(<Logo size={64} />);

		const sizeContainer = container.querySelector("[style]");
		expect(sizeContainer).toHaveAttribute("style", expect.stringContaining("width: 64px"));
		expect(sizeContainer).toHaveAttribute("style", expect.stringContaining("height: 64px"));
	});

	// =========================================================================
	// G11 — Nouveaux tests post-audit
	// =========================================================================

	it("triggers haptic on tap when href is provided (default 'selection')", () => {
		render(<Logo href="/" />);

		fireEvent.click(screen.getByRole("link"));

		expect(triggerHapticMock).toHaveBeenCalledTimes(1);
		expect(triggerHapticMock).toHaveBeenCalledWith("selection");
	});

	it("opts out of haptic when haptic={false}", () => {
		render(<Logo href="/" haptic={false} />);

		fireEvent.click(screen.getByRole("link"));

		expect(triggerHapticMock).not.toHaveBeenCalled();
	});

	it("uses custom ariaLabel when provided (overrides default fallback)", () => {
		render(<Logo href="/produits" ariaLabel="Voir le catalogue" />);

		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Voir le catalogue");
	});

	it("falls back to BRAND.name (no '- Accueil' suffix) for unknown hrefs without ariaLabel", () => {
		render(<Logo href="/produits" />);

		expect(screen.getByRole("link")).toHaveAttribute("aria-label", "Synclune");
	});

	it("applies viewTransitionName on the image wrapper", () => {
		const { container } = render(<Logo viewTransitionName="shop-logo-footer" size={40} />);

		const sizeContainer = container.querySelector("[style]");
		expect(sizeContainer).toHaveAttribute(
			"style",
			expect.stringContaining("view-transition-name: shop-logo-footer"),
		);
	});

	it("applies rounded-lg class on link wrapper when rounded='lg' (focus ring coherence)", () => {
		render(<Logo href="/admin" rounded="lg" />);

		const link = screen.getByRole("link");
		expect(link.className).toContain("rounded-lg");
		expect(link.className).not.toContain("rounded-full");
	});

	it("uses object-contain class on the image (safer than object-cover for logos)", () => {
		render(<Logo />);

		expect(screen.getByTestId("logo-image")).toHaveAttribute(
			"class",
			expect.stringContaining("object-contain"),
		);
	});

	it("passes BRAND.logo.blurDataURL to Image placeholder", () => {
		render(<Logo />);

		expect(screen.getByTestId("logo-image")).toHaveAttribute(
			"data-blur",
			"data:image/svg+xml;base64,TESTBLUR",
		);
	});

	it("uses font-cursive as default text font when showText is true", () => {
		render(<Logo showText />);

		const brandName = screen.getByText("Synclune");
		expect(brandName.className).toContain("font-cursive");
	});

	it("adapts quality based on size (≤40 → 75, >40 → 90)", () => {
		const { container: small } = render(<Logo size={32} />);
		expect(small.querySelector("[data-testid='logo-image']")).toHaveAttribute("data-quality", "75");

		cleanup();

		const { container: large } = render(<Logo size={48} />);
		expect(large.querySelector("[data-testid='logo-image']")).toHaveAttribute("data-quality", "90");
	});

	it("respects explicit quality prop over adaptive default", () => {
		render(<Logo size={32} quality={95} />);

		expect(screen.getByTestId("logo-image")).toHaveAttribute("data-quality", "95");
	});

	it("applies shadow classes when shadow={true}", () => {
		const { container } = render(<Logo shadow />);

		const wrapper = container.querySelector("[style]");
		expect(wrapper?.className).toContain("shadow-md");
	});

	it("exposes BRAND.tagline as title when enableTooltip is true", () => {
		const { container } = render(<Logo enableTooltip />);

		const tooltipNode = container.querySelector("[title]");
		expect(tooltipNode).toHaveAttribute("title", "Créations uniques faites avec amour");
	});

	it("does NOT expose BRAND.tagline as title when enableTooltip is false (default)", () => {
		const { container } = render(<Logo />);

		expect(container.querySelector("[title]")).toBeNull();
	});
});
