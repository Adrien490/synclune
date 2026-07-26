import { use } from "react";
import { Palette } from "lucide-react";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyMobileList } from "@/modules/taxonomies/components/taxonomy-mobile-list";

import type { GetColorsReturn } from "@/modules/colors/types/color.types";
import { CreateColorButton } from "./create-color-button";
import { ColorMobileItem } from "./color-mobile-item";

interface ColorsMobileListProps {
	colorsPromise: Promise<GetColorsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ColorsMobileList({
	colorsPromise,
	perPage,
	hasActiveFilters,
}: ColorsMobileListProps) {
	const { colors, pagination, totalCount } = use(colorsPromise);

	return (
		<TaxonomyMobileList
			config={TAXONOMY_CONFIG.color}
			items={colors}
			pagination={pagination}
			totalCount={totalCount}
			perPage={perPage}
			hasActiveFilters={hasActiveFilters}
			icon={Palette}
			emptyDescription="Aucune teinte à la palette pour l'instant."
			createButton={<CreateColorButton />}
			renderItem={(item) => <ColorMobileItem color={item} />}
		/>
	);
}
