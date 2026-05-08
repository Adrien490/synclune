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

// Import AFTER mocks
import { Toolbar } from "../toolbar";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Toolbar", () => {
	it("renders a toolbar element with role='toolbar'", () => {
		render(<Toolbar>children</Toolbar>);

		expect(screen.getByRole("toolbar")).toBeInTheDocument();
	});

	it("renders children inside the toolbar", () => {
		render(
			<Toolbar>
				<button>Filtrer</button>
				<button>Trier</button>
			</Toolbar>,
		);

		expect(screen.getByRole("button", { name: "Filtrer" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Trier" })).toBeInTheDocument();
	});

	it("uses default aria-label when none is provided", () => {
		render(<Toolbar>children</Toolbar>);

		expect(screen.getByRole("toolbar")).toHaveAttribute(
			"aria-label",
			"Barre d'outils de filtrage et recherche",
		);
	});

	it("applies custom aria-label when provided", () => {
		render(<Toolbar ariaLabel="Barre de gestion des produits">children</Toolbar>);

		expect(screen.getByRole("toolbar")).toHaveAttribute(
			"aria-label",
			"Barre de gestion des produits",
		);
	});

	it("applies custom className to the toolbar", () => {
		render(<Toolbar className="my-toolbar-class">children</Toolbar>);

		expect(screen.getByRole("toolbar")).toHaveClass("my-toolbar-class");
	});

	it("sets aria-busy when isPending is true", () => {
		render(<Toolbar isPending={true}>children</Toolbar>);

		expect(screen.getByRole("toolbar")).toHaveAttribute("aria-busy", "true");
	});

	it("sets aria-busy to false when isPending is false", () => {
		render(<Toolbar isPending={false}>children</Toolbar>);

		expect(screen.getByRole("toolbar")).toHaveAttribute("aria-busy", "false");
	});

	it("renders search component when search prop is provided", () => {
		render(
			<Toolbar search={<input placeholder="Rechercher…" />}>
				<button>Filtrer</button>
			</Toolbar>,
		);

		expect(screen.getByPlaceholderText("Rechercher…")).toBeInTheDocument();
	});

	it("renders children in a separate container when search is provided", () => {
		render(
			<Toolbar search={<input placeholder="Rechercher…" />}>
				<button>Filtrer</button>
			</Toolbar>,
		);

		// With search, there are two child divs: one for search, one for children
		const toolbar = screen.getByRole("toolbar");
		const divs = toolbar.querySelectorAll(":scope > div");
		expect(divs).toHaveLength(2);
	});

	it("renders a single container without search wrapper when no search is provided", () => {
		render(
			<Toolbar>
				<button>Filtrer</button>
			</Toolbar>,
		);

		// Without search, children are direct children of the toolbar
		const toolbar = screen.getByRole("toolbar");
		expect(toolbar.querySelectorAll(":scope > div")).toHaveLength(0);
	});

	it("has aria-orientation='horizontal'", () => {
		render(<Toolbar>children</Toolbar>);

		expect(screen.getByRole("toolbar")).toHaveAttribute("aria-orientation", "horizontal");
	});
});
