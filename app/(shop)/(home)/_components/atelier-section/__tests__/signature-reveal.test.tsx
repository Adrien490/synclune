import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/styles/fonts", () => ({
	caveat: { className: "font-cursive" },
}));

// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SignatureReveal", () => {
	let SignatureReveal: React.ComponentType;

	beforeAll(async () => {
		({ SignatureReveal } = await import("../signature-reveal"));
	});

	it("ne pose pas d'aria-label sur le <p> wrapper (le texte visible 'Léane' suffit, évite double-lecture screen-reader)", () => {
		const { container } = render(<SignatureReveal />);

		const wrapper = container.querySelector("p.signature-reveal");
		expect(wrapper).not.toBeNull();
		expect(wrapper!.getAttribute("aria-label")).toBeNull();
	});

	it("renders the name 'Léane'", () => {
		render(<SignatureReveal />);

		expect(screen.getByText("Léane")).toBeInTheDocument();
	});

	it("name span has the script font class", () => {
		render(<SignatureReveal />);

		const nameSpan = screen.getByText("Léane");
		expect(nameSpan.classList.contains("font-cursive")).toBe(true);
	});

	it("name span has signature-name class", () => {
		render(<SignatureReveal />);

		const nameSpan = screen.getByText("Léane");
		expect(nameSpan.classList.contains("signature-name")).toBe(true);
	});

	it("renders an SVG em dash element", () => {
		const { container } = render(<SignatureReveal />);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
	});

	it("SVG em dash has aria-hidden=true", () => {
		const { container } = render(<SignatureReveal />);

		const svg = container.querySelector("svg");
		expect(svg!.getAttribute("aria-hidden")).toBe("true");
	});

	it("SVG line has doodle-draw and doodle-draw-scroll classes", () => {
		const { container } = render(<SignatureReveal />);

		const line = container.querySelector("line");
		expect(line).not.toBeNull();
		expect(line!.classList.contains("doodle-draw")).toBe(true);
		expect(line!.classList.contains("doodle-draw-scroll")).toBe(true);
	});

	it("SVG line has --path-length and --draw-delay custom properties", () => {
		const { container } = render(<SignatureReveal />);

		const line = container.querySelector("line");
		const style = line!.getAttribute("style") ?? "";
		expect(style).toContain("--path-length");
		expect(style).toContain("--draw-delay");
	});

	it("wrapper has signature-reveal class", () => {
		const { container } = render(<SignatureReveal />);

		const wrapper = container.querySelector(".signature-reveal");
		expect(wrapper).not.toBeNull();
	});

	it("wrapper has text-center class", () => {
		const { container } = render(<SignatureReveal />);

		const wrapper = container.querySelector(".text-center");
		expect(wrapper).not.toBeNull();
	});
});
