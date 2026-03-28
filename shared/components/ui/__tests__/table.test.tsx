import { cleanup, render, screen, within } from "@testing-library/react";
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
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "../table";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Table", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a table element", () => {
		render(<Table />);
		expect(screen.getByRole("table")).toBeInTheDocument();
	});

	it("wraps table in a role=region div by default", () => {
		const { container } = render(<Table />);
		const region = container.querySelector("[role='region']");
		expect(region).toBeInTheDocument();
	});

	it("region has aria-label defaulting to 'Tableau de données'", () => {
		const { container } = render(<Table />);
		const region = container.querySelector("[role='region']");
		expect(region).toHaveAttribute("aria-label", "Tableau de données");
	});

	it("uses caption as aria-label for the region when caption is provided", () => {
		const { container } = render(<Table caption="Orders list" />);
		const region = container.querySelector("[role='region']");
		expect(region).toHaveAttribute("aria-label", "Orders list");
	});

	it("renders TableCaption inside table when caption is provided", () => {
		const { container } = render(<Table caption="My Table" />);
		expect(container.querySelector("caption")).toBeInTheDocument();
	});

	it("does not render region wrapper when noRegion is true", () => {
		const { container } = render(<Table noRegion />);
		expect(container.querySelector("[role='region']")).not.toBeInTheDocument();
	});

	it("applies striped data attribute when striped is true", () => {
		render(<Table striped />);
		expect(screen.getByRole("table")).toHaveAttribute("data-striped", "true");
	});

	it("does not set data-striped when striped is false", () => {
		render(<Table />);
		expect(screen.getByRole("table")).not.toHaveAttribute("data-striped");
	});

	it("region has tabIndex=0 for keyboard access", () => {
		const { container } = render(<Table />);
		const region = container.querySelector("[role='region']");
		expect(region).toHaveAttribute("tabindex", "0");
	});

	it("applies stickyHeader class to region", () => {
		const { container } = render(<Table stickyHeader />);
		const region = container.querySelector("[role='region']");
		expect(region?.className).toContain("max-h-[70vh]");
	});

	it("has data-slot=table", () => {
		render(<Table />);
		expect(screen.getByRole("table")).toHaveAttribute("data-slot", "table");
	});
});

describe("TableHeader", () => {
	it("renders a thead element", () => {
		render(
			<table>
				<TableHeader>
					<tr />
				</TableHeader>
			</table>,
		);
		expect(document.querySelector("thead")).toBeInTheDocument();
	});

	it("has data-slot=table-header", () => {
		render(
			<table>
				<TableHeader>
					<tr />
				</TableHeader>
			</table>,
		);
		expect(document.querySelector("[data-slot='table-header']")).toBeInTheDocument();
	});

	it("applies sticky class when sticky=true", () => {
		render(
			<table>
				<TableHeader sticky>
					<tr />
				</TableHeader>
			</table>,
		);
		expect(document.querySelector("thead")?.className).toContain("sticky");
	});
});

describe("TableBody", () => {
	it("renders a tbody element", () => {
		render(
			<table>
				<TableBody />
			</table>,
		);
		expect(document.querySelector("tbody")).toBeInTheDocument();
	});

	it("has data-slot=table-body", () => {
		render(
			<table>
				<TableBody />
			</table>,
		);
		expect(document.querySelector("[data-slot='table-body']")).toBeInTheDocument();
	});

	it("sets aria-busy when isLoading=true", () => {
		render(
			<table>
				<TableBody isLoading />
			</table>,
		);
		expect(document.querySelector("tbody")).toHaveAttribute("aria-busy", "true");
	});

	it("applies opacity-50 class when isLoading=true", () => {
		render(
			<table>
				<TableBody isLoading />
			</table>,
		);
		expect(document.querySelector("tbody")?.className).toContain("opacity-50");
	});

	it("does not set aria-busy when not loading", () => {
		render(
			<table>
				<TableBody />
			</table>,
		);
		expect(document.querySelector("tbody")).not.toHaveAttribute("aria-busy");
	});
});

describe("TableRow", () => {
	it("renders a tr element", () => {
		render(
			<table>
				<tbody>
					<TableRow />
				</tbody>
			</table>,
		);
		expect(document.querySelector("tr")).toBeInTheDocument();
	});

	it("has data-slot=table-row", () => {
		render(
			<table>
				<tbody>
					<TableRow />
				</tbody>
			</table>,
		);
		expect(document.querySelector("[data-slot='table-row']")).toBeInTheDocument();
	});
});

describe("TableHead", () => {
	it("renders a th element", () => {
		render(
			<table>
				<thead>
					<tr>
						<TableHead>Header</TableHead>
					</tr>
				</thead>
			</table>,
		);
		expect(document.querySelector("th")).toBeInTheDocument();
	});

	it("has scope=col", () => {
		render(
			<table>
				<thead>
					<tr>
						<TableHead>Col</TableHead>
					</tr>
				</thead>
			</table>,
		);
		expect(document.querySelector("th")).toHaveAttribute("scope", "col");
	});
});

describe("TableCell", () => {
	it("renders a td element", () => {
		render(
			<table>
				<tbody>
					<tr>
						<TableCell>Cell</TableCell>
					</tr>
				</tbody>
			</table>,
		);
		expect(document.querySelector("td")).toBeInTheDocument();
	});
});

describe("TableCaption", () => {
	it("renders a caption element", () => {
		render(
			<table>
				<TableCaption>My Caption</TableCaption>
			</table>,
		);
		expect(document.querySelector("caption")).toBeInTheDocument();
	});

	it("renders children", () => {
		render(
			<table>
				<TableCaption>Caption Text</TableCaption>
			</table>,
		);
		expect(screen.getByText("Caption Text")).toBeInTheDocument();
	});
});
