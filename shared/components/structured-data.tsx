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
 * Valide selon schema.org (array de schemas).
 */
export function StructuredData({ reviewStats }: StructuredDataProps) {
	const schemas = [
		getOrganizationSchema(),
		getWebSiteSchema(),
		getLocalBusinessSchema(reviewStats),
		getFounderSchema(),
	];

	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(schemas),
			}}
		/>
	);
}
