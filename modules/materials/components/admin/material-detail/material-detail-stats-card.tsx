import { TaxonomyStatsCard } from "@/modules/taxonomies/components/taxonomy-detail-layout";

interface MaterialDetailStatsCardProps {
	skusCount: number;
	productsCount: number;
}

export function MaterialDetailStatsCard({
	skusCount,
	productsCount,
}: MaterialDetailStatsCardProps) {
	return (
		<TaxonomyStatsCard
			stats={[
				{ label: "Variantes actives", value: skusCount },
				{ label: "Produits distincts", value: productsCount },
			]}
		/>
	);
}
