import { use } from "react";
import Link from "next/link";
import { PackageIcon } from "@phosphor-icons/react/ssr";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetProductVariantsReturn } from "@/modules/variants/types/variants.types";

import { VariantMobileItem } from "./variant-mobile-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

interface VariantsMobileListProps {
	variantsPromise: Promise<GetProductVariantsReturn>;
	productSlug: string;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function VariantsMobileList({
	variantsPromise,
	productSlug,
	perPage,
	hasActiveFilters,
}: VariantsMobileListProps) {
	const { productVariants, pagination, representativeVariantId } = use(variantsPromise);

	if (productVariants.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={PackageIcon}
					title="Aucune variante"
					description={
						hasActiveFilters
							? "Aucune variante ne correspond aux critères."
							: "Ce produit n'a pas encore de variante."
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction
								href={`/admin/catalogue/produits/${productSlug}/variantes`}
							/>
						) : (
							<Link
								href={`/admin/catalogue/produits/${productSlug}/variantes/nouveau`}
								className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
							>
								Créer une variante
							</Link>
						)
					}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			{/* Pas de `totalCount` : `getProductVariants` n'en expose pas (liste bornée
			    aux variantes d'un seul produit). */}
			<AdminListLiveCount count={productVariants.length} singular="variante" plural="variantes" />
			<ItemGroup aria-label="Variantes" className="gap-2">
				{productVariants.map((variant, index) => (
					<li key={variant.id}>
						<VariantMobileItem
							variant={variant}
							productSlug={productSlug}
							preload={index === 0}
							isRepresentative={variant.id === representativeVariantId}
						/>
					</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={productVariants.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
			/>
		</div>
	);
}
