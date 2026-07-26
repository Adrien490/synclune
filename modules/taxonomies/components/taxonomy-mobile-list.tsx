import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { ItemGroup } from "@/shared/components/ui/item";

import { agree } from "../config/taxonomy.config";
import type { TaxonomyConfig } from "../types/taxonomy.types";

interface TaxonomyPagination {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	nextCursor: string | null;
	prevCursor: string | null;
}

interface TaxonomyMobileListProps<T extends { id: string }> {
	config: TaxonomyConfig;
	items: ReadonlyArray<T>;
	pagination: TaxonomyPagination;
	totalCount: number;
	perPage: number;
	hasActiveFilters?: boolean;
	/** Icône de l'état vide (une palette, une gemme, des étiquettes…). */
	icon: LucideIcon;
	/** Phrase d'état vide hors filtres — propre à chaque taxonomie. */
	emptyDescription: string;
	/** Bouton de création, rendu dans l'état vide. */
	createButton: ReactNode;
	/** Rendu d'une ligne — les cartes diffèrent réellement d'une taxonomie à l'autre. */
	renderItem: (item: T) => ReactNode;
}

/**
 * Liste mobile des taxonomies : état vide, compteur live, groupe d'items et
 * pagination curseur. Seule la carte d'un item reste per-kind (une couleur
 * affiche sa pastille, un type son drapeau système), passée en `renderItem`.
 */
export function TaxonomyMobileList<T extends { id: string }>({
	config,
	items,
	pagination,
	totalCount,
	perPage,
	hasActiveFilters,
	icon,
	emptyDescription,
	createButton,
	renderItem,
}: TaxonomyMobileListProps<T>) {
	const { singular, plural, capitalizedPlural } = config.labels;

	if (items.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={icon}
					title={`${agree(config, "Aucun")} ${singular} ${agree(config, "trouvé")}`}
					description={
						hasActiveFilters
							? `${agree(config, "Aucun")} ${singular} ne correspond aux critères de recherche.`
							: emptyDescription
					}
					actionElement={
						hasActiveFilters ? (
							<EmptyResetFiltersAction href={config.basePath} />
						) : (
							createButton
						)
					}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount
				count={items.length}
				singular={singular}
				plural={plural}
				totalCount={totalCount}
			/>
			<ItemGroup aria-label={capitalizedPlural} className="gap-2">
				{items.map((item) => (
					<li key={item.id}>{renderItem(item)}</li>
				))}
			</ItemGroup>

			<AdminMobileListPagination
				perPage={perPage}
				hasNextPage={pagination.hasNextPage}
				hasPreviousPage={pagination.hasPreviousPage}
				currentPageSize={items.length}
				nextCursor={pagination.nextCursor}
				prevCursor={pagination.prevCursor}
				totalCount={totalCount}
			/>
		</div>
	);
}
