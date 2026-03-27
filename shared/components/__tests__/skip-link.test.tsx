import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { SkipLink } from "../skip-link";

// ============================================================================
// SkipLink
// ============================================================================

describe("SkipLink", () => {
	afterEach(cleanup);

	it("renders a link element", () => {
		render(<SkipLink />);
		const link = screen.getByRole("link");
		expect(link).toBeInTheDocument();
	});

	it("link has href='#main-content'", () => {
		render(<SkipLink />);
		expect(screen.getByRole("link")).toHaveAttribute("href", "#main-content");
	});

	it("link text is 'Aller au contenu principal'", () => {
		render(<SkipLink />);
		expect(screen.getByText("Aller au contenu principal")).toBeInTheDocument();
	});

	it("link has sr-only class for visual hiding by default", () => {
		render(<SkipLink />);
		const link = screen.getByRole("link");
		expect(link.className).toContain("sr-only");
	});
});
