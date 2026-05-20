import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// Import AFTER mocks
import { RequiredFieldsNote } from "../required-fields-note";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RequiredFieldsNote", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders default text", () => {
		render(<RequiredFieldsNote />);
		expect(
			screen.getByText("Les champs marqués d'un astérisque sont obligatoires."),
		).toBeInTheDocument();
	});

	it("renders custom text when provided", () => {
		render(<RequiredFieldsNote text="Tous les champs sont requis." />);
		expect(screen.getByText("Tous les champs sont requis.")).toBeInTheDocument();
	});

	it("renders the asterisk with aria-hidden", () => {
		const { container } = render(<RequiredFieldsNote />);
		const asterisk = container.querySelector('[aria-hidden="true"]');
		expect(asterisk).toBeInTheDocument();
		expect(asterisk?.textContent).toBe("*");
	});

	it("renders as a paragraph element", () => {
		const { container } = render(<RequiredFieldsNote />);
		expect(container.querySelector("p")).toBeInTheDocument();
	});

	it("applies custom className", () => {
		const { container } = render(<RequiredFieldsNote className="mt-4" />);
		expect(container.querySelector("p")).toHaveClass("mt-4");
	});

	it("aligns the asterisk to the first line of wrapped text (items-baseline)", () => {
		const { container } = render(<RequiredFieldsNote />);
		const paragraph = container.querySelector("p");
		expect(paragraph).toHaveClass("items-baseline");
		expect(paragraph).not.toHaveClass("items-center");
	});
});
