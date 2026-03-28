import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { ExpandableReviewContent } from "../expandable-review-content";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ExpandableReviewContent", () => {
	it("renders short content as a plain paragraph", () => {
		const shortContent = "Très bien.";
		render(<ExpandableReviewContent content={shortContent} />);
		expect(screen.getByText("Très bien.")).toBeInTheDocument();
		expect(document.querySelector("details")).toBeNull();
	});

	it("renders long content in a details element", () => {
		const longContent = "A".repeat(300);
		render(<ExpandableReviewContent content={longContent} />);
		expect(document.querySelector("details")).not.toBeNull();
	});

	it("shows 'Lire la suite' for long content", () => {
		const longContent = "A".repeat(300);
		render(<ExpandableReviewContent content={longContent} />);
		expect(screen.getByText("Lire la suite")).toBeInTheDocument();
	});

	it("renders with itemProp='reviewBody' on short content", () => {
		const shortContent = "Court texte";
		render(<ExpandableReviewContent content={shortContent} />);
		expect(document.querySelector('[itemprop="reviewBody"]')).not.toBeNull();
	});

	it("renders 'Voir moins' in long content (hidden by default)", () => {
		const longContent = "A".repeat(300);
		render(<ExpandableReviewContent content={longContent} />);
		expect(screen.getByText("Voir moins")).toBeInTheDocument();
	});

	it("uses clampLines=5 by default for long content", () => {
		const longContent = "A".repeat(300);
		render(<ExpandableReviewContent content={longContent} />);
		expect(document.querySelector(".line-clamp-5")).not.toBeNull();
	});

	it("uses clampLines=3 when specified", () => {
		const longContent = "A".repeat(300);
		render(<ExpandableReviewContent content={longContent} clampLines={3} />);
		expect(document.querySelector(".line-clamp-3")).not.toBeNull();
	});
});
