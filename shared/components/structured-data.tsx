import {
	getFounderSchema,
	getLocalBusinessSchema,
	getOrganizationSchema,
	getWebSiteSchema,
	type GlobalReviewStats,
} from "@/shared/constants/seo-config";

interface StructuredDataProps {
	reviewStats?: GlobalReviewStats;
}

/**
 * Composant consolidant tous les schemas JSON-LD en un seul script.
 * Utilise le format @graph standard pour combiner plusieurs schemas.
 */
export function StructuredData({ reviewStats }: StructuredDataProps) {
	const schemas = [
		getOrganizationSchema(),
		getWebSiteSchema(),
		getLocalBusinessSchema(reviewStats),
		getFounderSchema(),
	];

	// Transformer en format @graph (supprimer @context de chaque schema)
	const graphSchemas = schemas.map(({ "@context": _, ...rest }) => rest);

	const jsonLd = {
		"@context": "https://schema.org",
		"@graph": graphSchemas,
	};

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				// Sanitization XSS recommandée par Next.js
				__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
			}}
		/>
	);
}
