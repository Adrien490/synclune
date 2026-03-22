import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("@/shared/styles/fonts", () => ({
	fraunces: { className: "font-display" },
}));

vi.mock("@/shared/types/component.types", () => ({}));

// Import AFTER mocks
import { SectionTitle } from "../section-title";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SectionTitle", () => {
	it("renders children text", () => {
		render(<SectionTitle>Collections Phares</SectionTitle>);

		expect(screen.getByText("Collections Phares")).toBeInTheDocument();
	});

	it("renders as h2 by default", () => {
		render(<SectionTitle>Mon titre</SectionTitle>);

		expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
	});

	it("renders as h1 when as='h1' is passed", () => {
		render(<SectionTitle as="h1">Titre principal</SectionTitle>);

		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
	});

	it("renders as h3 when as='h3' is passed", () => {
		render(<SectionTitle as="h3">Sous-titre</SectionTitle>);

		expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
	});

	it("applies custom className", () => {
		render(<SectionTitle className="my-custom-class">Titre</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveClass("my-custom-class");
	});

	it("applies fraunces font className", () => {
		render(<SectionTitle>Titre</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveClass("font-display");
	});

	it("applies italic class when italic prop is true", () => {
		render(<SectionTitle italic>Titre italique</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveClass("italic");
	});

	it("does not apply italic class when italic prop is false", () => {
		render(<SectionTitle>Titre normal</SectionTitle>);

		expect(screen.getByRole("heading")).not.toHaveClass("italic");
	});

	it("applies id attribute when provided", () => {
		render(<SectionTitle id="section-collections">Titre</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveAttribute("id", "section-collections");
	});

	it("applies center alignment class by default", () => {
		render(<SectionTitle>Titre</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveClass("text-center");
	});

	it("applies left alignment class when align='left'", () => {
		render(<SectionTitle align="left">Titre</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveClass("text-left");
	});

	it("applies itemProp attribute when provided", () => {
		render(<SectionTitle itemProp="name">Titre Schema</SectionTitle>);

		expect(screen.getByRole("heading")).toHaveAttribute("itemprop", "name");
	});

	it("renders with size='hero' applying hero size classes", () => {
		render(<SectionTitle size="hero">Grand titre</SectionTitle>);

		const heading = screen.getByRole("heading");
		expect(heading.className).toContain("text-5xl");
	});

	it("renders with size='small' applying small size classes", () => {
		render(<SectionTitle size="small">Petit titre</SectionTitle>);

		const heading = screen.getByRole("heading");
		expect(heading.className).toContain("text-2xl");
	});
});
