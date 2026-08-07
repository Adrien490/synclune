import { CreateTaxonomyButton } from "@/modules/taxonomies/components/taxonomy-list-controls";
import { use } from "react";
import { ShapesIcon } from "@phosphor-icons/react/ssr";

import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { TaxonomyMobileList } from "@/modules/taxonomies/components/taxonomy-mobile-list";

import type { GetProductTypesReturn } from "@/modules/product-types/types/product-type.types";
import { ProductTypeMobileItem } from "./product-type-mobile-item";

interface ProductTypesMobileListProps {
	productTypesPromise: Promise<GetProductTypesReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ProductTypesMobileList({
	productTypesPromise,
	perPage,
	hasActiveFilters,
}: ProductTypesMobileListProps) {
	const { productTypes, pagination, totalCount } = use(productTypesPromise);

	return (
		<TaxonomyMobileList
			config={TAXONOMY_CONFIG["product-type"]}
			items={productTypes}
			pagination={pagination}
			totalCount={totalCount}
			perPage={perPage}
			hasActiveFilters={hasActiveFilters}
			icon={ShapesIcon}
			emptyDescription="Aucun type de bijou pour l'instant."
			createButton={<CreateTaxonomyButton kind="product-type" />}
			renderItem={(item) => <ProductTypeMobileItem productType={item} />}
		/>
	);
}
