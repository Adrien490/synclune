/**
 * Safely serializes an object to a JSON-LD string for use in
 * `dangerouslySetInnerHTML`. Escapes `<`, `>`, and `&` to prevent
 * script injection via `</script>` or HTML entity tricks.
 */
export function safeJsonLd(data: object): string {
	return JSON.stringify(data)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026");
}
