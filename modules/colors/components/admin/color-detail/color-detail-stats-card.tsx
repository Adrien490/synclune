import { TaxonomyStatsCard } from "@/modules/taxonomies/components/taxonomy-detail-layout";

interface ColorDetailStatsCardProps {
	skusCount: number;
	productsCount: number;
}

export function ColorDetailStatsCard({ skusCount, productsCount }: ColorDetailStatsCardProps) {
	return (
		<TaxonomyStatsCard
			stats={[
				{ label: "Variantes actives", value: skusCount },
				{ label: "Produits distincts", value: productsCount },
			]}
		/>
	);
}
