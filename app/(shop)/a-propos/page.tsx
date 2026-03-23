import { permanentRedirect } from "next/navigation";

/**
 * Page À propos — temporarily hidden.
 * 308 redirect to homepage to preserve link equity from external links.
 */
export default function AboutPage() {
	permanentRedirect("/");
}
