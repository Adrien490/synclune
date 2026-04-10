import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Import AFTER (no mocks needed — pure SVG components)
import { VisaIcon, MastercardIcon, CBIcon } from "../icons/payment-icons";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS — VisaIcon
// ============================================================================

describe("VisaIcon", () => {
	it("renders an SVG element", () => {
		const { container } = render(<VisaIcon />);

		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("has role='img' for accessibility", () => {
		render(<VisaIcon />);

		expect(screen.getByRole("img")).toBeInTheDocument();
	});

	it("has default aria-label 'Visa'", () => {
		render(<VisaIcon />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Visa");
	});

	it("renders a <title> element with the default label", () => {
		const { container } = render(<VisaIcon />);

		const title = container.querySelector("title");
		expect(title).toBeInTheDocument();
		expect(title?.textContent).toBe("Visa");
	});

	it("accepts a custom aria-label", () => {
		render(<VisaIcon aria-label="Payer par Visa" />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Payer par Visa");
	});

	it("renders <title> with the custom aria-label", () => {
		const { container } = render(<VisaIcon aria-label="Custom Visa" />);

		expect(container.querySelector("title")?.textContent).toBe("Custom Visa");
	});

	it("forwards className to the SVG", () => {
		const { container } = render(<VisaIcon className="my-visa-class" />);

		expect(container.querySelector("svg")).toHaveClass("my-visa-class");
	});

	it("has the correct default dimensions (32x20)", () => {
		const { container } = render(<VisaIcon />);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("width", "32");
		expect(svg).toHaveAttribute("height", "20");
	});

	it("has the correct viewBox", () => {
		const { container } = render(<VisaIcon />);

		expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 32 20");
	});
});

// ============================================================================
// TESTS — MastercardIcon
// ============================================================================

describe("MastercardIcon", () => {
	it("renders an SVG element", () => {
		const { container } = render(<MastercardIcon />);

		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("has role='img' for accessibility", () => {
		render(<MastercardIcon />);

		expect(screen.getByRole("img")).toBeInTheDocument();
	});

	it("has default aria-label 'Mastercard'", () => {
		render(<MastercardIcon />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Mastercard");
	});

	it("renders a <title> element with the default label", () => {
		const { container } = render(<MastercardIcon />);

		const title = container.querySelector("title");
		expect(title).toBeInTheDocument();
		expect(title?.textContent).toBe("Mastercard");
	});

	it("accepts a custom aria-label", () => {
		render(<MastercardIcon aria-label="Payer par Mastercard" />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Payer par Mastercard");
	});

	it("forwards className to the SVG", () => {
		const { container } = render(<MastercardIcon className="mc-class" />);

		expect(container.querySelector("svg")).toHaveClass("mc-class");
	});

	it("has the correct default dimensions (32x20)", () => {
		const { container } = render(<MastercardIcon />);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("width", "32");
		expect(svg).toHaveAttribute("height", "20");
	});

	it("has the correct viewBox", () => {
		const { container } = render(<MastercardIcon />);

		expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 32 20");
	});

	it("renders two overlapping circles for the Mastercard logo", () => {
		const { container } = render(<MastercardIcon />);
		const circles = container.querySelectorAll("circle");

		expect(circles.length).toBeGreaterThanOrEqual(2);
	});
});

// ============================================================================
// TESTS — CBIcon
// ============================================================================

describe("CBIcon", () => {
	it("renders an SVG element", () => {
		const { container } = render(<CBIcon />);

		expect(container.querySelector("svg")).toBeInTheDocument();
	});

	it("has role='img' for accessibility", () => {
		render(<CBIcon />);

		expect(screen.getByRole("img")).toBeInTheDocument();
	});

	it("has default aria-label 'Carte Bancaire'", () => {
		render(<CBIcon />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Carte Bancaire");
	});

	it("renders a <title> element with the default label", () => {
		const { container } = render(<CBIcon />);

		const title = container.querySelector("title");
		expect(title).toBeInTheDocument();
		expect(title?.textContent).toBe("Carte Bancaire");
	});

	it("accepts a custom aria-label", () => {
		render(<CBIcon aria-label="CB acceptée" />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "CB acceptée");
	});

	it("forwards className to the SVG", () => {
		const { container } = render(<CBIcon className="cb-class" />);

		expect(container.querySelector("svg")).toHaveClass("cb-class");
	});

	it("has the correct default dimensions (32x20)", () => {
		const { container } = render(<CBIcon />);
		const svg = container.querySelector("svg");

		expect(svg).toHaveAttribute("width", "32");
		expect(svg).toHaveAttribute("height", "20");
	});

	it("has the correct viewBox", () => {
		const { container } = render(<CBIcon />);

		expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 32 20");
	});
});
