import { TaxonomyStatsCard } from "@/modules/taxonomies/components/taxonomy-detail-layout";

interface ColorDetailStatsCardProps {
	variantsCount: number;
	productsCount: number;
}

export function ColorDetailStatsCard({ variantsCount, productsCount }: ColorDetailStatsCardProps) {
	return (
		<TaxonomyStatsCard
			stats={[
				{ label: "Variantes actives", value: variantsCount },
				{ label: "Produits distincts", value: productsCount },
			]}
		/>
	);
}
