import { TaxonomyStatsCard } from "@/modules/taxonomies/components/taxonomy-detail-layout";

interface ProductTypeDetailStatsCardProps {
	total: number;
	counts: { public: number; draft: number; archived: number };
}

export function ProductTypeDetailStatsCard({ total, counts }: ProductTypeDetailStatsCardProps) {
	return (
		<TaxonomyStatsCard
			stats={[
				{ label: "Total", value: total },
				{ label: "Publics", value: counts.public },
				{ label: "Brouillons", value: counts.draft },
				{ label: "Archivés", value: counts.archived },
			]}
		/>
	);
}
