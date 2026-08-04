import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	SITE_URL,
} from "@/shared/constants/seo-config";

import { safeJsonLd } from "@/shared/utils/safe-json-ld";

interface StructuredDataProps {
	includeHomepageSchemas?: boolean;
}

/**
 * Consolidates all JSON-LD schemas into a single @graph script.
 * Sync component — data must be passed as props (no Suspense around <script> tags).
 */
// Remove @context from each schema for @graph format
const BASE_GRAPH_SCHEMAS: Record<string, unknown>[] = [
	getOrganizationSchema(),
	getWebSiteSchema(),
	getLocalBusinessSchema(),
	getFounderSchema(),
].map(({ "@context": _, ...rest }) => rest);

export function StructuredData({ includeHomepageSchemas }: StructuredDataProps) {
	// Copie par rendu : le tableau est muté (push) selon les props.
	const graphSchemas: Record<string, unknown>[] = [...BASE_GRAPH_SCHEMAS];

	if (includeHomepageSchemas) {
		// BreadcrumbList for homepage
		graphSchemas.push({
			"@type": "BreadcrumbList",
			"@id": `${SITE_URL}/#homepage-breadcrumb`,
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Accueil",
					item: SITE_URL,
				},
			],
		});
	}

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": graphSchemas,
	};

	return (
		// SAFE: serialized via safeJsonLd (no user HTML)
		// react-doctor-disable-next-line react/no-danger
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: safeJsonLd(jsonLd),
			}}
		/>
	);
}
