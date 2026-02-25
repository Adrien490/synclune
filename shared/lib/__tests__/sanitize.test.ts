import { describe, it, expect } from "vitest"
import { sanitizeForEmail, newlinesToBr, sanitizeText } from "../sanitize"

describe("sanitizeForEmail", () => {
	it("should escape < and >", () => {
		expect(sanitizeForEmail("<b>bold</b>")).toBe("&lt;b&gt;bold&lt;/b&gt;")
	})

	it("should escape a script tag XSS vector", () => {
		const input = "<script>alert('xss')</script>"
		const result = sanitizeForEmail(input)
		expect(result).not.toContain("<script>")
		expect(result).toContain("&lt;script&gt;")
		expect(result).toContain("&#x27;")
	})

	it("should escape ampersands", () => {
		expect(sanitizeForEmail("a & b")).toBe("a &amp; b")
	})

	it("should escape double quotes", () => {
		expect(sanitizeForEmail('say "hello"')).toBe("say &quot;hello&quot;")
	})

	it("should escape single quotes", () => {
		expect(sanitizeForEmail("it's")).toBe("it&#x27;s")
	})

	it("should escape backslashes", () => {
		expect(sanitizeForEmail("C:\\path")).toBe("C:&#x5C;path")
	})

	it("should strip Unicode control characters (except newlines)", () => {
		// \x00 (null byte) and \x01 should be removed
		const result = sanitizeForEmail("\x00hello\x01world")
		expect(result).toBe("helloworld")
	})

	it("should preserve newline characters \\n", () => {
		const result = sanitizeForEmail("line1\nline2")
		expect(result).toContain("\n")
	})

	it("should preserve carriage return \\r", () => {
		const result = sanitizeForEmail("line1\r\nline2")
		expect(result).toContain("\r")
	})

	it("should limit output to 10000 characters", () => {
		const longString = "a".repeat(20000)
		expect(sanitizeForEmail(longString)).toHaveLength(10000)
	})

	it("should handle an empty string", () => {
		expect(sanitizeForEmail("")).toBe("")
	})

	it("should handle plain text without modification (except passthrough)", () => {
		expect(sanitizeForEmail("Hello world")).toBe("Hello world")
	})

	it("should escape encoded entity evasion attempts (raw ampersand)", () => {
		// User sends "&lt;" as literal text - the & gets escaped to &amp;
		const result = sanitizeForEmail("&lt;script&gt;")
		expect(result).toBe("&amp;lt;script&amp;gt;")
	})
})

describe("newlinesToBr", () => {
	it("should replace \\n with <br>", () => {
		expect(newlinesToBr("line1\nline2")).toBe("line1<br>line2")
	})

	it("should replace multiple \\n", () => {
		expect(newlinesToBr("a\nb\nc")).toBe("a<br>b<br>c")
	})

	it("should return the string unchanged when there are no newlines", () => {
		expect(newlinesToBr("no newlines here")).toBe("no newlines here")
	})

	it("should handle an empty string", () => {
		expect(newlinesToBr("")).toBe("")
	})

	it("should not replace \\r (carriage return) alone", () => {
		expect(newlinesToBr("line1\rline2")).toBe("line1\rline2")
	})
})

describe("sanitizeText", () => {
	it("should strip a script tag and preserve surrounding text", () => {
		// sanitizeText strips tags but keeps inner text content
		const result = sanitizeText("<script>alert('xss')</script>Hello")
		expect(result).not.toContain("<script>")
		expect(result).not.toContain("</script>")
		expect(result).toContain("Hello")
	})

	it("should decode &lt;script&gt; before stripping tags", () => {
		// After decoding, <script>alert()</script> becomes a real tag and gets stripped.
		// The inner text content "alert()" remains (tags are removed, not inner text).
		const result = sanitizeText("&lt;script&gt;alert()&lt;/script&gt;")
		expect(result).not.toContain("<script>")
		expect(result).not.toContain("&lt;script&gt;")
		// Inner text is preserved per the function's documented behaviour
		expect(result).toBe("alert()")
	})

	it("should strip HTML tags but keep text content", () => {
		const result = sanitizeText("<b>bold</b> and <i>italic</i>")
		expect(result).toBe("bold and italic")
	})

	it("should decode &amp; to &", () => {
		const result = sanitizeText("Tom &amp; Jerry")
		expect(result).toBe("Tom & Jerry")
	})

	it("should decode &quot; to double-quote", () => {
		const result = sanitizeText("say &quot;hello&quot;")
		expect(result).toBe('say "hello"')
	})

	it("should decode &#x27; to single-quote", () => {
		const result = sanitizeText("it&#x27;s fine")
		expect(result).toBe("it's fine")
	})

	it("should decode numeric HTML entities", () => {
		// &#65; is 'A'
		const result = sanitizeText("&#65;")
		expect(result).toBe("A")
	})

	it("should decode hex HTML entities", () => {
		// &#x41; is 'A'
		const result = sanitizeText("&#x41;")
		expect(result).toBe("A")
	})

	it("should trim whitespace from the result", () => {
		expect(sanitizeText("  hello  ")).toBe("hello")
	})

	it("should handle an empty string", () => {
		expect(sanitizeText("")).toBe("")
	})

	it("should handle plain text without HTML", () => {
		expect(sanitizeText("Just plain text")).toBe("Just plain text")
	})
})
