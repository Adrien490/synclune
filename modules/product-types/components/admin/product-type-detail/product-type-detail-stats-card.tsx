import { TaxonomyStatsCard } from "@/modules/taxonomies/components/taxonomy-detail-layout";

interface ProductTypeDetailStatsCardProps {
	total: number;
	counts: { active: number; draft: number };
}

export function ProductTypeDetailStatsCard({ total, counts }: ProductTypeDetailStatsCardProps) {
	return (
		<TaxonomyStatsCard
			stats={[
				{ label: "Total", value: total },
				{ label: "En vente", value: counts.active },
				{ label: "Brouillons", value: counts.draft },
			]}
		/>
	);
}
