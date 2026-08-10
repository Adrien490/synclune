import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockTabNavigation } = vi.hoisted(() => ({
	mockTabNavigation: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/app/generated/prisma/client", () => ({
	PublicationStatus: {
		PUBLIC: "PUBLIC",
		DRAFT: "DRAFT",
		ARCHIVED: "ARCHIVED",
	},
}));

vi.mock("@/shared/components/tab-navigation", () => ({
	TabNavigation: (props: Record<string, unknown>) => {
		mockTabNavigation(props);
		return (
			<nav aria-label={props.ariaLabel as string} data-testid="tab-navigation">
				{(props.items as Array<{ label: string; href: string; value: string }>).map((item) => (
					<a
						key={item.value}
						href={item.href}
						aria-current={props.activeValue === item.value ? "page" : undefined}
					>
						{item.label}
					</a>
				))}
			</nav>
		);
	},
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { ProductStatusNavigation } from "../product-status-navigation";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProductStatusNavigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	describe("rendering", () => {
		it("renders tab navigation", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(screen.getByTestId("tab-navigation")).toBeInTheDocument();
		});

		it("renders 4 items: Tous + 3 statuses", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			const links = screen.getAllByRole("link");
			expect(links).toHaveLength(4);
		});

		it("renders 'Tous' tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(screen.getByRole("link", { name: "Tous" })).toBeInTheDocument();
		});

		it("renders 'Publics' tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(screen.getByRole("link", { name: "Publics" })).toBeInTheDocument();
		});

		it("renders 'Brouillons' tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(screen.getByRole("link", { name: "Brouillons" })).toBeInTheDocument();
		});

		it("renders 'Archivés' tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(screen.getByRole("link", { name: "Archivés" })).toBeInTheDocument();
		});

		it("passes aria-label to TabNavigation", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(
				screen.getByRole("navigation", { name: "Navigation par statuts de bijoux" }),
			).toBeInTheDocument();
		});
	});

	// ─── Active status ────────────────────────────────────────────────────────

	describe("active status", () => {
		it("passes 'all' as activeValue when currentStatus is undefined", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			expect(mockTabNavigation).toHaveBeenCalledWith(
				expect.objectContaining({ activeValue: "all" }),
			);
		});

		it("passes 'PUBLIC' as activeValue when currentStatus is PUBLIC", () => {
			render(<ProductStatusNavigation currentStatus="PUBLIC" />);
			expect(mockTabNavigation).toHaveBeenCalledWith(
				expect.objectContaining({ activeValue: "PUBLIC" }),
			);
		});

		it("passes 'DRAFT' as activeValue when currentStatus is DRAFT", () => {
			render(<ProductStatusNavigation currentStatus="DRAFT" />);
			expect(mockTabNavigation).toHaveBeenCalledWith(
				expect.objectContaining({ activeValue: "DRAFT" }),
			);
		});

		it("passes 'ARCHIVED' as activeValue when currentStatus is ARCHIVED", () => {
			render(<ProductStatusNavigation currentStatus="ARCHIVED" />);
			expect(mockTabNavigation).toHaveBeenCalledWith(
				expect.objectContaining({ activeValue: "ARCHIVED" }),
			);
		});

		it("marks 'Tous' as current page when status is undefined", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			const link = screen.getByRole("link", { name: "Tous" });
			expect(link).toHaveAttribute("aria-current", "page");
		});

		it("marks 'Publics' as current page when status is PUBLIC", () => {
			render(<ProductStatusNavigation currentStatus="PUBLIC" />);
			const link = screen.getByRole("link", { name: "Publics" });
			expect(link).toHaveAttribute("aria-current", "page");
		});
	});

	// ─── URL generation ───────────────────────────────────────────────────────

	describe("URL generation", () => {
		it("generates correct href for Tous tab with default pathname", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			const link = screen.getByRole("link", { name: "Tous" });
			expect(link.getAttribute("href")).toContain("status=all");
		});

		it("generates correct href for PUBLIC tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			const link = screen.getByRole("link", { name: "Publics" });
			expect(link.getAttribute("href")).toContain("status=PUBLIC");
		});

		it("generates correct href for DRAFT tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			const link = screen.getByRole("link", { name: "Brouillons" });
			expect(link.getAttribute("href")).toContain("status=DRAFT");
		});

		it("generates correct href for ARCHIVED tab", () => {
			render(<ProductStatusNavigation currentStatus={undefined} />);
			const link = screen.getByRole("link", { name: "Archivés" });
			expect(link.getAttribute("href")).toContain("status=ARCHIVED");
		});

		it("uses custom pathname when provided", () => {
			render(<ProductStatusNavigation currentStatus={undefined} pathname="/admin/custom-path" />);
			const link = screen.getByRole("link", { name: "Tous" });
			expect(link.getAttribute("href")).toContain("/admin/custom-path");
		});

		it("preserves existing search params (except status, cursor, direction)", () => {
			render(
				<ProductStatusNavigation currentStatus={undefined} searchParams={{ search: "bague" }} />,
			);
			const link = screen.getByRole("link", { name: "Publics" });
			const href = link.getAttribute("href") ?? "";
			expect(href).toContain("search=bague");
			expect(href).toContain("status=PUBLIC");
		});

		it("strips cursor and direction params from generated hrefs", () => {
			render(
				<ProductStatusNavigation
					currentStatus={undefined}
					searchParams={{ cursor: "abc", direction: "forward", search: "bague" }}
				/>,
			);
			const link = screen.getByRole("link", { name: "Publics" });
			const href = link.getAttribute("href") ?? "";
			expect(href).not.toContain("cursor");
			expect(href).not.toContain("direction");
		});
	});
});
