import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement("a", { href, ...props }, children);
	},
}));

// Import AFTER mocks
import { BreadcrumbNav } from "../breadcrumb-nav";

afterEach(cleanup);

const ITEMS = [
	{ label: "Créations", href: "/produits" },
	{ label: "Colliers", href: "/produits/colliers" },
];

describe("BreadcrumbNav", () => {
	it("est un nav étiqueté « Fil d'Ariane »", () => {
		render(<BreadcrumbNav items={ITEMS} />);

		expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeInTheDocument();
	});

	it("ajoute « Accueil » d'office en tête — l'appelant ne doit PAS le passer", () => {
		render(<BreadcrumbNav items={ITEMS} />);

		const home = screen.getByRole("link", { name: "Accueil" });
		expect(home).toHaveAttribute("href", "/");
	});

	it("rend le dernier maillon en <span aria-current='page'>, sans lien", () => {
		render(<BreadcrumbNav items={ITEMS} />);

		const current = screen.getByText("Colliers");
		expect(current.tagName).toBe("SPAN");
		expect(current).toHaveAttribute("aria-current", "page");
		expect(screen.queryByRole("link", { name: "Colliers" })).not.toBeInTheDocument();
	});

	it("lie les maillons intermédiaires", () => {
		render(<BreadcrumbNav items={ITEMS} />);

		expect(screen.getByRole("link", { name: "Créations" })).toHaveAttribute("href", "/produits");
	});

	it("n'émet AUCUN JSON-LD — le balisage appartient au générateur de la page", () => {
		const { container } = render(<BreadcrumbNav items={ITEMS} />);

		expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
	});
});
