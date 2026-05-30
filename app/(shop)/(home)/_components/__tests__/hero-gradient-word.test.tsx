import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { HeroGradientWord } from "../hero-gradient-word";

afterEach(() => {
	cleanup();
});

describe("HeroGradientWord", () => {
	it("renders the accent word text", () => {
		render(<HeroGradientWord>colorés</HeroGradientWord>);
		expect(screen.getByText("colorés")).toBeInTheDocument();
	});

	it("applies the gradient utility class", () => {
		render(<HeroGradientWord>colorés</HeroGradientWord>);
		expect(screen.getByText("colorés")).toHaveClass("text-gradient-multicolor");
	});

	it("merges a passed className without dropping the gradient class", () => {
		render(<HeroGradientWord className="custom-class font-bold">colorés</HeroGradientWord>);
		const span = screen.getByText("colorés");
		expect(span).toHaveClass("text-gradient-multicolor");
		expect(span).toHaveClass("custom-class");
		expect(span).toHaveClass("font-bold");
	});

	it("does not hardcode lang or font-weight (weight inherited from parent title)", () => {
		render(<HeroGradientWord>colorés</HeroGradientWord>);
		const span = screen.getByText("colorés");
		expect(span).not.toHaveAttribute("lang");
		expect(span).not.toHaveClass("font-light");
	});
});
