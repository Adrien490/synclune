import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/constants/brand", () => ({
	BRAND: {
		name: "Synclune",
		logo: {
			url: "/logo.webp",
			alt: "Logo Synclune - Créations artisanales faites main",
		},
	},
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
		quality: _quality,
		placeholder: _placeholder,
		blurDataURL: _blur,
		"aria-hidden": ariaHidden,
		...props
	}: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("img", {
			src,
			alt,
			className,
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
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement("a", { href, className, "aria-label": ariaLabel, ...props }, children);
	},
}));

// Import AFTER mocks
import { Logo } from "../logo";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

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
		expect(img).toHaveAttribute("alt", "Logo Synclune - Créations artisanales faites main");
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
		expect(sizeContainer).toHaveAttribute("style", "width: 64px; height: 64px;");
	});
});
