/**
 * Returns true if the link is safe to render as a storefront href:
 * - Internal path starting with `/` (but NOT protocol-relative `//evil.com`)
 * - Absolute HTTPS URL (`https://...`)
 *
 * Rejects: empty, `javascript:`, `http://` (insecure), `//evil.com` (open redirect),
 * mailto/tel/data, anything else.
 */
export function isSafeStorefrontLink(href: string): boolean {
	if (href === "") return false;
	if (href.startsWith("//")) return false;
	if (href.startsWith("/")) return true;
	if (href.startsWith("https://")) return true;
	return false;
}
