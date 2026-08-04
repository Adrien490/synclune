import type React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="chevron-right" {...props} />
	),
	Ellipsis: (props: React.SVGProps<SVGSVGElement>) => (
		<svg data-testid="ellipsis-icon" {...props} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
} from "../breadcrumb";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Breadcrumb", () => {
	it("renders a nav element with aria-label 'breadcrumb'", () => {
		render(<Breadcrumb />);

		const nav = screen.getByRole("navigation", { name: "breadcrumb" });
		expect(nav).toBeInTheDocument();
	});
});

describe("BreadcrumbList", () => {
	it("renders an ol element", () => {
		render(<BreadcrumbList />);

		expect(document.querySelector("[data-slot='breadcrumb-list']")?.tagName).toBe("OL");
	});
});

describe("BreadcrumbItem", () => {
	it("renders a li element", () => {
		render(
			<ul>
				<BreadcrumbItem>item</BreadcrumbItem>
			</ul>,
		);

		const li = document.querySelector("[data-slot='breadcrumb-item']");
		expect(li?.tagName).toBe("LI");
	});
});

describe("BreadcrumbPage", () => {
	it("has aria-current='page'", () => {
		render(<BreadcrumbPage>Produit</BreadcrumbPage>);

		const page = document.querySelector("[data-slot='breadcrumb-page']");
		expect(page).toHaveAttribute("aria-current", "page");
	});
});

describe("BreadcrumbSeparator", () => {
	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has aria-hidden='true'", () => {
		render(
			<ul>
				<BreadcrumbSeparator />
			</ul>,
		);

		const separator = document.querySelector("[data-slot='breadcrumb-separator']");
		expect(separator).toHaveAttribute("aria-hidden", "true");
	});

	it("has role='presentation'", () => {
		render(
			<ul>
				<BreadcrumbSeparator />
			</ul>,
		);

		const separator = document.querySelector("[data-slot='breadcrumb-separator']");
		expect(separator).toHaveAttribute("role", "presentation");
	});

	// ============================================================================
	// DEFAULT ICON
	// ============================================================================

	it("renders the default ChevronRight icon when no children provided", () => {
		render(
			<ul>
				<BreadcrumbSeparator />
			</ul>,
		);

		expect(screen.getByTestId("chevron-right")).toBeInTheDocument();
	});

	// ============================================================================
	// CUSTOM CHILDREN
	// ============================================================================

	it("renders custom children instead of ChevronRight when provided", () => {
		render(
			<ul>
				<BreadcrumbSeparator>
					<span data-testid="custom-sep">/</span>
				</BreadcrumbSeparator>
			</ul>,
		);

		expect(screen.getByTestId("custom-sep")).toBeInTheDocument();
		expect(screen.queryByTestId("chevron-right")).not.toBeInTheDocument();
	});
});

describe("BreadcrumbEllipsis", () => {
	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has aria-hidden='true'", () => {
		render(<BreadcrumbEllipsis />);

		const ellipsis = document.querySelector("[data-slot='breadcrumb-ellipsis']");
		expect(ellipsis).toHaveAttribute("aria-hidden", "true");
	});

	it("has sr-only text 'Plus'", () => {
		render(<BreadcrumbEllipsis />);

		const srOnly = document.querySelector(".sr-only");
		expect(srOnly?.textContent).toBe("Plus");
	});
});
