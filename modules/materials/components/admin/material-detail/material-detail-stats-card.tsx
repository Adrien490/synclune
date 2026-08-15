import { TaxonomyStatsCard } from "@/modules/taxonomies/components/taxonomy-detail-layout";

interface MaterialDetailStatsCardProps {
	variantsCount: number;
	productsCount: number;
}

export function MaterialDetailStatsCard({
	variantsCount,
	productsCount,
}: MaterialDetailStatsCardProps) {
	return (
		<TaxonomyStatsCard
			stats={[
				{ label: "Variantes actives", value: variantsCount },
				{ label: "Produits distincts", value: productsCount },
			]}
		/>
	);
}
