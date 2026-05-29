import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { matchesWordStart } from "@/modules/products/utils/match-word-start";
import { HighlightMatch } from "@/modules/products/components/quick-search-dialog/search-result-item";
import { FOCUSABLE_SELECTOR } from "@/modules/products/components/quick-search-dialog/constants";

afterEach(() => {
	cleanup();
	document.body.innerHTML = "";
});

// ─── matchesWordStart ──────────────────────────────────────────

describe("matchesWordStart", () => {
	it("returns true when text starts with query", () => {
		expect(matchesWordStart("Oreilles", "or")).toBe(true);
	});

	it("returns true when query starts with text", () => {
		expect(matchesWordStart("Or", "oreilles")).toBe(true);
	});

	it("returns true for word-start match in multi-word text", () => {
		expect(matchesWordStart("Boucles Oreilles", "or")).toBe(true);
	});

	it("returns false when query matches word middle", () => {
		expect(matchesWordStart("Colorees", "or")).toBe(false);
	});

	it("is case insensitive for text", () => {
		expect(matchesWordStart("BRACELETS", "bra")).toBe(true);
		expect(matchesWordStart("Colliers", "col")).toBe(true);
		expect(matchesWordStart("Bagues Argent", "arg")).toBe(true);
	});

	it("returns true for empty query", () => {
		expect(matchesWordStart("Test", "")).toBe(true);
	});

	it("returns true for exact match", () => {
		expect(matchesWordStart("Bagues", "bagues")).toBe(true);
	});

	it("returns false when no match exists", () => {
		expect(matchesWordStart("Colliers", "bra")).toBe(false);
	});

	it("handles multiple spaces between words", () => {
		expect(matchesWordStart("Boucles  d  Oreilles", "or")).toBe(true);
	});

	it("matches accented characters correctly", () => {
		expect(matchesWordStart("Émeraude", "ém")).toBe(true);
		expect(matchesWordStart("Chaîne", "cha")).toBe(true);
	});

	it("returns true when text is substring of query", () => {
		expect(matchesWordStart("Bag", "bagues")).toBe(true);
	});

	it("handles single character query", () => {
		expect(matchesWordStart("Oreilles", "o")).toBe(true);
		expect(matchesWordStart("Boucles Oreilles", "o")).toBe(true);
		expect(matchesWordStart("Colliers", "o")).toBe(false);
	});
});

// ─── HighlightMatch ──────────────────────────────────────────

describe("HighlightMatch", () => {
	it("returns full text with no mark elements when query is empty", () => {
		render(<HighlightMatch text="Boucles Oreilles" query="" />);
		expect(screen.queryByRole("mark")).not.toBeInTheDocument();
		expect(screen.getByText("Boucles Oreilles")).toBeInTheDocument();
	});

	it("returns full text with no mark elements when query is whitespace", () => {
		render(<HighlightMatch text="Colliers" query="   " />);
		expect(screen.queryByRole("mark")).not.toBeInTheDocument();
		expect(screen.getByText("Colliers")).toBeInTheDocument();
	});

	it("wraps single match in mark element", () => {
		const { container } = render(<HighlightMatch text="Boucles Oreilles" query="Bou" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("Bou");
	});

	it("is case insensitive", () => {
		const { container } = render(<HighlightMatch text="Boucles Oreilles" query="bou" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("Bou");
	});

	it("safely escapes regex special characters in query", () => {
		const { container } = render(<HighlightMatch text="Prix: 10.50€ (a+b)" query="a+b" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("a+b");
	});

	it("highlights multiple matches", () => {
		const { container } = render(<HighlightMatch text="Or rose et or blanc" query="or" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(2);
		expect(marks[0]?.textContent).toBe("Or");
		expect(marks[1]?.textContent).toBe("or");
	});

	it("returns plain text when no match exists", () => {
		const { container } = render(<HighlightMatch text="Pendentifs" query="bra" />);
		expect(container.querySelectorAll("mark")).toHaveLength(0);
		expect(container.textContent).toBe("Pendentifs");
	});

	it("applies correct CSS classes to mark elements", () => {
		const { container } = render(<HighlightMatch text="Boucles" query="Bou" />);
		const mark = container.querySelector("mark");
		expect(mark).toHaveClass("bg-primary/25", "text-foreground", "font-medium", "rounded-sm");
	});

	it("handles partial word matches", () => {
		const { container } = render(<HighlightMatch text="Bagues en argent" query="arg" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("arg");
	});

	it("handles query matching entire text", () => {
		const { container } = render(<HighlightMatch text="Bagues" query="Bagues" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("Bagues");
	});

	it("escapes all regex special characters", () => {
		const specialChars = [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"];
		specialChars.forEach((char) => {
			const { container } = render(<HighlightMatch text={`Test ${char} text`} query={char} />);
			const marks = container.querySelectorAll("mark");
			expect(marks).toHaveLength(1);
			expect(marks[0]?.textContent).toBe(char);
		});
	});

	it("handles consecutive matches", () => {
		const { container } = render(<HighlightMatch text="aaa" query="a" />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(3);
	});

	it("preserves text structure between matches", () => {
		const { container } = render(<HighlightMatch text="Or et Or et Or" query="Or" />);
		const marks = container.querySelectorAll("mark");
		const spans = container.querySelectorAll("span");
		expect(marks).toHaveLength(3);
		expect(spans).toHaveLength(4); // Empty spans before/after + 2 " et " spans
	});

	it("highlights synonym terms", () => {
		const { container } = render(
			<HighlightMatch
				text="Bague Lune en Argent"
				query="anneau"
				synonyms={["bague", "alliance"]}
			/>,
		);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("Bague");
	});

	it("highlights both query and synonym matches", () => {
		const { container } = render(
			<HighlightMatch text="Bague Anneau Lune" query="anneau" synonyms={["bague"]} />,
		);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(2);
	});

	it("handles empty synonyms array", () => {
		const { container } = render(<HighlightMatch text="Bague Lune" query="Bague" synonyms={[]} />);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
		expect(marks[0]?.textContent).toBe("Bague");
	});

	it("handles undefined synonyms", () => {
		const { container } = render(
			<HighlightMatch text="Bague Lune" query="Bague" synonyms={undefined} />,
		);
		const marks = container.querySelectorAll("mark");
		expect(marks).toHaveLength(1);
	});
});

// ─── FOCUSABLE_SELECTOR ──────────────────────────────────────────

// Arrow-key roving is scoped to [role="option"] (F1): only the selectable
// options are navigable; auxiliary controls (delete ×, "Effacer", "Voir tout",
// "Réessayer") are deliberately excluded and remain reachable via Tab.
describe("FOCUSABLE_SELECTOR", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("matches elements with role='option' regardless of tag", () => {
		document.body.innerHTML = `
			<div>
				<button role="option">Option button</button>
				<a href="/test" role="option">Option link</a>
				<div role="option">Option div</div>
			</div>
		`;
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR);
		expect(focusable).toHaveLength(3);
	});

	it("excludes auxiliary controls without role='option' (the F1 fix)", () => {
		document.body.innerHTML = `
			<div>
				<button role="option">Recent search</button>
				<button aria-label="Supprimer">×</button>
				<button>Effacer</button>
				<a href="/collections">Voir toutes les collections</a>
			</div>
		`;
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR);
		expect(focusable).toHaveLength(1);
		expect(focusable[0]?.textContent).toBe("Recent search");
	});

	it("excludes aria-disabled options", () => {
		document.body.innerHTML = `
			<div>
				<button role="option">Enabled</button>
				<button role="option" aria-disabled="true">Aria Disabled</button>
			</div>
		`;
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR);
		expect(focusable).toHaveLength(1);
		expect(focusable[0]?.textContent).toBe("Enabled");
	});

	it("does not match the search input or plain buttons", () => {
		document.body.innerHTML = `
			<div>
				<input type="search" />
				<button>Plain button</button>
				<a href="/x">Plain link</a>
			</div>
		`;
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR);
		expect(focusable).toHaveLength(0);
	});

	it("preserves DOM order of options", () => {
		document.body.innerHTML = `
			<div>
				<a href="/1" role="option">First</a>
				<button>not an option</button>
				<a href="/2" role="option">Second</a>
			</div>
		`;
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR);
		expect(focusable).toHaveLength(2);
		expect(focusable[0]?.textContent).toBe("First");
		expect(focusable[1]?.textContent).toBe("Second");
	});
});
