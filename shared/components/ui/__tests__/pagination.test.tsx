import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
	buttonVariants: (opts?: Record<string, unknown>) => opts?.variant ?? "default",
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretLeftIcon: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="chevron-left" {...props} />
	),
	CaretRightIcon: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="chevron-right" {...props} />
	),
	DotsThreeIcon: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="more-horizontal" {...props} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
} from "../pagination";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Pagination", () => {
	it("renders a nav element with aria-label 'Pagination'", () => {
		render(<Pagination />);

		const nav = screen.getByRole("navigation", { name: "Pagination" });
		expect(nav).toBeInTheDocument();
	});
});

describe("PaginationContent", () => {
	it("renders a ul element", () => {
		render(
			<ul>
				<PaginationContent />
			</ul>,
		);

		expect(document.querySelector("[data-slot='pagination-content']")?.tagName).toBe("UL");
	});
});

describe("PaginationItem", () => {
	it("renders a li element", () => {
		render(
			<ul>
				<PaginationItem>item</PaginationItem>
			</ul>,
		);

		const li = document.querySelector("[data-slot='pagination-item']");
		expect(li?.tagName).toBe("LI");
	});
});

describe("PaginationLink", () => {
	// ============================================================================
	// ELEMENT TYPE
	// ============================================================================

	it("renders an anchor element", () => {
		render(<PaginationLink href="/page/1">1</PaginationLink>);

		expect(screen.getByRole("link", { name: "1" })).toBeInTheDocument();
	});

	// ============================================================================
	// ACTIVE STATE
	// ============================================================================

	it("has aria-current='page' when isActive is true", () => {
		render(
			<PaginationLink href="/page/1" isActive>
				1
			</PaginationLink>,
		);

		const link = screen.getByRole("link", { name: "1" });
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("does not have aria-current when isActive is false", () => {
		render(
			<PaginationLink href="/page/2" isActive={false}>
				2
			</PaginationLink>,
		);

		const link = screen.getByRole("link", { name: "2" });
		expect(link).not.toHaveAttribute("aria-current");
	});
});

describe("PaginationPrevious", () => {
	it("has aria-label 'Aller à la page précédente'", () => {
		render(<PaginationPrevious href="/page/0" />);

		expect(screen.getByRole("link", { name: "Aller à la page précédente" })).toBeInTheDocument();
	});
});

describe("PaginationNext", () => {
	it("has aria-label 'Aller à la page suivante'", () => {
		render(<PaginationNext href="/page/2" />);

		expect(screen.getByRole("link", { name: "Aller à la page suivante" })).toBeInTheDocument();
	});
});

describe("PaginationEllipsis", () => {
	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has aria-hidden='true'", () => {
		render(<PaginationEllipsis />);

		const ellipsis = document.querySelector("[data-slot='pagination-ellipsis']");
		expect(ellipsis).toHaveAttribute("aria-hidden", "true");
	});

	it("has sr-only text 'Plus de pages'", () => {
		render(<PaginationEllipsis />);

		const srOnly = document.querySelector(".sr-only");
		expect(srOnly?.textContent).toBe("Plus de pages");
	});
});
