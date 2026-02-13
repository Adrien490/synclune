import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { matchesWordStart } from "@/modules/products/components/quick-search-dialog/quick-search-content"
import { HighlightMatch } from "@/modules/products/components/quick-search-dialog/highlight-match"
import { FOCUSABLE_SELECTOR } from "@/modules/products/components/quick-search-dialog/constants"

afterEach(() => {
	cleanup()
	document.body.innerHTML = ""
})

// ─── matchesWordStart ──────────────────────────────────────────

describe("matchesWordStart", () => {
	it("returns true when text starts with query", () => {
		expect(matchesWordStart("Oreilles", "or")).toBe(true)
	})

	it("returns true when query starts with text", () => {
		expect(matchesWordStart("Or", "oreilles")).toBe(true)
	})

	it("returns true for word-start match in multi-word text", () => {
		expect(matchesWordStart("Boucles Oreilles", "or")).toBe(true)
	})

	it("returns false when query matches word middle", () => {
		expect(matchesWordStart("Colorees", "or")).toBe(false)
	})

	it("is case insensitive for text", () => {
		expect(matchesWordStart("BRACELETS", "bra")).toBe(true)
		expect(matchesWordStart("Colliers", "col")).toBe(true)
		expect(matchesWordStart("Bagues Argent", "arg")).toBe(true)
	})

	it("returns true for empty query", () => {
		expect(matchesWordStart("Test", "")).toBe(true)
	})

	it("returns true for exact match", () => {
		expect(matchesWordStart("Bagues", "bagues")).toBe(true)
	})

	it("returns false when no match exists", () => {
		expect(matchesWordStart("Colliers", "bra")).toBe(false)
	})

	it("handles multiple spaces between words", () => {
		expect(matchesWordStart("Boucles  d  Oreilles", "or")).toBe(true)
	})

	it("matches accented characters correctly", () => {
		expect(matchesWordStart("Émeraude", "ém")).toBe(true)
		expect(matchesWordStart("Chaîne", "cha")).toBe(true)
	})

	it("returns true when text is substring of query", () => {
		expect(matchesWordStart("Bag", "bagues")).toBe(true)
	})

	it("handles single character query", () => {
		expect(matchesWordStart("Oreilles", "o")).toBe(true)
		expect(matchesWordStart("Boucles Oreilles", "o")).toBe(true)
		expect(matchesWordStart("Colliers", "o")).toBe(false)
	})
})

// ─── HighlightMatch ──────────────────────────────────────────

describe("HighlightMatch", () => {
	it("returns full text with no mark elements when query is empty", () => {
		render(<HighlightMatch text="Boucles Oreilles" query="" />)
		expect(screen.queryByRole("mark")).not.toBeInTheDocument()
		expect(screen.getByText("Boucles Oreilles")).toBeInTheDocument()
	})

	it("returns full text with no mark elements when query is whitespace", () => {
		render(<HighlightMatch text="Colliers" query="   " />)
		expect(screen.queryByRole("mark")).not.toBeInTheDocument()
		expect(screen.getByText("Colliers")).toBeInTheDocument()
	})

	it("wraps single match in mark element", () => {
		const { container } = render(<HighlightMatch text="Boucles Oreilles" query="Bou" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(1)
		expect(marks[0]?.textContent).toBe("Bou")
	})

	it("is case insensitive", () => {
		const { container } = render(<HighlightMatch text="Boucles Oreilles" query="bou" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(1)
		expect(marks[0]?.textContent).toBe("Bou")
	})

	it("safely escapes regex special characters in query", () => {
		const { container } = render(<HighlightMatch text="Prix: 10.50€ (a+b)" query="a+b" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(1)
		expect(marks[0]?.textContent).toBe("a+b")
	})

	it("highlights multiple matches", () => {
		const { container } = render(<HighlightMatch text="Or rose et or blanc" query="or" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(2)
		expect(marks[0]?.textContent).toBe("Or")
		expect(marks[1]?.textContent).toBe("or")
	})

	it("returns plain text when no match exists", () => {
		const { container } = render(<HighlightMatch text="Pendentifs" query="bra" />)
		expect(container.querySelectorAll("mark")).toHaveLength(0)
		expect(container.textContent).toBe("Pendentifs")
	})

	it("applies correct CSS classes to mark elements", () => {
		const { container } = render(<HighlightMatch text="Boucles" query="Bou" />)
		const mark = container.querySelector("mark")
		expect(mark).toHaveClass("bg-primary/15", "text-foreground", "font-medium", "rounded-sm")
	})

	it("handles partial word matches", () => {
		const { container } = render(<HighlightMatch text="Bagues en argent" query="arg" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(1)
		expect(marks[0]?.textContent).toBe("arg")
	})

	it("handles query matching entire text", () => {
		const { container } = render(<HighlightMatch text="Bagues" query="Bagues" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(1)
		expect(marks[0]?.textContent).toBe("Bagues")
	})

	it("escapes all regex special characters", () => {
		const specialChars = [".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "\\"]
		specialChars.forEach((char) => {
			const { container } = render(<HighlightMatch text={`Test ${char} text`} query={char} />)
			const marks = container.querySelectorAll("mark")
			expect(marks).toHaveLength(1)
			expect(marks[0]?.textContent).toBe(char)
		})
	})

	it("handles consecutive matches", () => {
		const { container } = render(<HighlightMatch text="aaa" query="a" />)
		const marks = container.querySelectorAll("mark")
		expect(marks).toHaveLength(3)
	})

	it("preserves text structure between matches", () => {
		const { container } = render(<HighlightMatch text="Or et Or et Or" query="Or" />)
		const marks = container.querySelectorAll("mark")
		const spans = container.querySelectorAll("span")
		expect(marks).toHaveLength(3)
		expect(spans).toHaveLength(4) // Empty spans before/after + 2 " et " spans
	})
})

// ─── FOCUSABLE_SELECTOR ──────────────────────────────────────────

describe("FOCUSABLE_SELECTOR", () => {
	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("matches enabled buttons", () => {
		document.body.innerHTML = `
			<div>
				<button>Click me</button>
				<button type="submit">Submit</button>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(2)
	})

	it("excludes disabled buttons", () => {
		document.body.innerHTML = `
			<div>
				<button>Enabled</button>
				<button disabled>Disabled</button>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(1)
		expect(focusable[0]?.textContent).toBe("Enabled")
	})

	it("excludes aria-disabled buttons", () => {
		document.body.innerHTML = `
			<div>
				<button>Enabled</button>
				<button aria-disabled="true">Aria Disabled</button>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(1)
		expect(focusable[0]?.textContent).toBe("Enabled")
	})

	it("matches links", () => {
		document.body.innerHTML = `
			<div>
				<a href="/test">Link 1</a>
				<a href="/test2">Link 2</a>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(2)
	})

	it("excludes elements with tabindex=-1 (except buttons/links which match earlier rules)", () => {
		const container = document.createElement("div")
		container.innerHTML = `
			<button>Normal button</button>
			<button tabindex="-1">Button with tabindex -1</button>
			<a href="/test" tabindex="-1">Link with tabindex -1</a>
			<div tabindex="-1">Excluded div</div>
		`
		const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(3) // All buttons and links (tabindex=-1 on button/link doesn't exclude them), div with tabindex=-1 IS excluded
	})

	it("excludes search inputs with tabindex", () => {
		document.body.innerHTML = `
			<div>
				<input type="text" tabindex="0" />
				<input type="search" tabindex="0" />
				<button>Button</button>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(2) // text input + button (search excluded)
	})

	it("matches elements with positive tabindex", () => {
		document.body.innerHTML = `
			<div>
				<div tabindex="0">Focusable div</div>
				<span tabindex="1">Focusable span</span>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(2)
	})

	it("matches mix of buttons, links, and tabindex elements", () => {
		const container = document.createElement("div")
		container.innerHTML = `
			<button>Button</button>
			<a href="/test">Link</a>
			<div tabindex="0">Focusable div</div>
			<button disabled>Disabled</button>
			<button tabindex="-1">Button with -1</button>
			<input type="search" tabindex="0" />
		`
		const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(4) // button + link + div + button (tabindex=-1 doesn't exclude buttons; excludes disabled, search)
	})

	it("handles aria-disabled on links", () => {
		document.body.innerHTML = `
			<div>
				<a href="/test">Enabled link</a>
				<a href="/test" aria-disabled="true">Disabled link</a>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(1)
		expect(focusable[0]?.textContent).toBe("Enabled link")
	})

	it("excludes disabled attribute on links (non-standard but handled)", () => {
		document.body.innerHTML = `
			<div>
				<a href="/test">Enabled link</a>
				<a href="/test" disabled>Disabled link</a>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(1)
		expect(focusable[0]?.textContent).toBe("Enabled link")
	})

	it("allows search input without tabindex", () => {
		document.body.innerHTML = `
			<div>
				<input type="search" />
				<button>Button</button>
			</div>
		`
		const focusable = document.querySelectorAll(FOCUSABLE_SELECTOR)
		expect(focusable).toHaveLength(1) // Only button (search has no tabindex so not matched by [tabindex])
	})
})
