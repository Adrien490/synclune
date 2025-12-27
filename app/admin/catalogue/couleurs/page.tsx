import { DEFAULT_PER_PAGE } from "@/shared/components/cursor-pagination/pagination";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getColors, SORT_LABELS } from "@/modules/colors/data/get-colors";
import { getFirstParam } from "@/shared/utils/params";
import { Suspense } from "react";
import { ColorsDataTable } from "@/modules/colors/components/admin/colors-data-table";
import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";
import { ColorsFilterBadges } from "@/modules/colors/components/admin/colors-filter-badges";
import { ColorsFilterSheet } from "@/modules/colors/components/admin/colors-filter-sheet";
import { CreateColorButton } from "@/modules/colors/components/admin/create-color-button";
import dynamic from "next/dynamic";

// Lazy loading - dialogs charges uniquement a l'ouverture
const ColorFormDialog = dynamic(
	() => import("@/modules/colors/components/color-form-dialog").then((mod) => mod.ColorFormDialog)
);
const DeleteColorAlertDialog = dynamic(
	() => import("@/modules/colors/components/admin/delete-color-alert-dialog").then((mod) => mod.DeleteColorAlertDialog)
);
import { RefreshColorsButton } from "@/modules/colors/components/admin/refresh-colors-button";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Couleurs - Administration",
	description: "Gérer les couleurs",
};

type ColorsAdminPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ColorsAdminPage({
	searchParams,
}: ColorsAdminPageProps) {
	const params = await searchParams;

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const perPage = Number(getFirstParam(params.perPage)) || DEFAULT_PER_PAGE;
	const sortBy = (getFirstParam(params.sortBy) || "name-ascending") as
		| "name-ascending"
		| "name-descending"
		| "skuCount-ascending"
		| "skuCount-descending";
	const search = getFirstParam(params.search);

	// La promise de couleurs n'est PAS awaitée pour permettre le streaming
	const colorsPromise = getColors({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {},
	});

	return (
		<>
			<PageHeader
				variant="compact"
				title="Couleurs"
				actions={<CreateColorButton />}
			/>

			<div className="space-y-6">
				<Toolbar
					ariaLabel="Barre d'outils de gestion des couleurs"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher par nom, slug ou hex..."
							ariaLabel="Rechercher une couleur par nom, slug ou code hex"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={Object.entries(SORT_LABELS).map(([value, label]) => ({
							value,
							label,
						}))}
						placeholder="Position"
						className="w-full sm:min-w-[180px]"
						noPrefix
					/>
					<ColorsFilterSheet />
					<RefreshColorsButton />
				</Toolbar>

				{/* Badges de filtres actifs */}
				<ColorsFilterBadges />

				<Suspense fallback={<ColorsDataTableSkeleton />}>
					<ColorsDataTable colorsPromise={colorsPromise} perPage={perPage} />
				</Suspense>
			</div>

			<ColorFormDialog />
			<DeleteColorAlertDialog />
		</>
	);
}
