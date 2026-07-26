import { use } from "react";
import { Gem } from "lucide-react";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyMobileList } from "@/modules/taxonomies/components/taxonomy-mobile-list";

import type { GetMaterialsReturn } from "@/modules/materials/types/materials.types";
import { CreateMaterialButton } from "./create-material-button";
import { MaterialMobileItem } from "./material-mobile-item";

interface MaterialsMobileListProps {
	materialsPromise: Promise<GetMaterialsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function MaterialsMobileList({ materialsPromise, perPage, hasActiveFilters }: MaterialsMobileListProps) {
	const { materials, pagination, totalCount } = use(materialsPromise);

	return (
		<TaxonomyMobileList
			config={TAXONOMY_CONFIG.material}
			items={materials}
			pagination={pagination}
			totalCount={totalCount}
			perPage={perPage}
			hasActiveFilters={hasActiveFilters}
			icon={Gem}
			emptyDescription="Aucune matière à l'atelier pour l'instant."
			createButton={<CreateMaterialButton />}
			renderItem={(item) => <MaterialMobileItem material={item} />}
		/>
	);
}
