import { FilterTriggerButton } from "@/shared/components/filter-trigger-button";
import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilSimpleIcon } from "@phosphor-icons/react/ssr";

import { VariantsAdminDialogs } from "./_components/variants-admin-dialogs";
import { VariantsProductContext } from "./_components/variants-product-context";
import { Button } from "@/shared/components/ui/button";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { getProductVariants } from "@/modules/variants/data/get-variants-list";
import { parseProductVariantParams } from "@/modules/variants/utils/parse-variant-params";
import { getColorOptions } from "@/modules/colors/data/get-color-options";
import { getMaterialOptions } from "@/modules/materials/data/get-material-options";
import { SORT_LABELS } from "@/modules/variants/constants/variant.constants";
import { ProductVariantsDataTable } from "@/modules/variants/components/admin/variants-data-table";
import { VariantsDataTableSkeleton } from "@/modules/variants/components/admin/variants-data-table-skeleton";
import { VariantsMobileList } from "@/modules/variants/components/admin/variants-mobile-list";
import { VariantsMobileListSkeleton } from "@/modules/variants/components/admin/variants-mobile-list-skeleton";
import { RefreshVariantsButton } from "@/modules/variants/components/admin/refresh-variants-button";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { VariantsBottomBar } from "@/modules/variants/components/admin/variants-bottom-bar";
import { VariantsFilterBadges } from "@/modules/variants/components/admin/variants-filter-badges";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export type ProductVariantsSearchParams = {
	cursor?: string;
	direction?: "forward" | "backward";
	perPage?: string;
	sortBy?: string;
	search?: string;
	filter_stockStatus?: string | string[];
	filter_colorId?: string | string[];
	filter_materialId?: string | string[];
	filter_isActive?: string;
};

type ProductVariantsPageProps = {
	params: Promise<{ slug: string }>;
	searchParams: Promise<ProductVariantsSearchParams>;
};

// Normalise une valeur string ou string[] en tableau
function normalizeArray(value: string | string[] | undefined): string[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

// Parse les filtres depuis les paramètres URL
function parseVariantFilters(params: ProductVariantsSearchParams) {
	const stockStatuses = normalizeArray(params.filter_stockStatus).filter((s) => s !== "all");
	const colorIds = normalizeArray(params.filter_colorId);
	const materialIds = normalizeArray(params.filter_materialId);

	// Parse active
	let active: boolean | undefined;
	if (params.filter_isActive === "true") {
		active = true;
	} else if (params.filter_isActive === "false") {
		active = false;
	}

	// ⚠️ Tous les statuts cochés sont transmis (union OR côté `buildFilterConditions`).
	// La version précédente ne les passait QUE s'il y en avait exactement un : cocher
	// « En stock » + « Stock faible » affichait deux badges et ne filtrait rien.
	const validStatuses = stockStatuses.filter(
		(status): status is "in_stock" | "low_stock" | "out_of_stock" =>
			status === "in_stock" || status === "low_stock" || status === "out_of_stock",
	);

	return {
		stockStatus: validStatuses.length > 0 ? validStatuses : undefined,
		colorId: colorIds.length > 0 ? colorIds : undefined,
		materialId: materialIds.length > 0 ? materialIds : undefined,
		active,
	};
}

export async function generateMetadata({ params }: ProductVariantsPageProps): Promise<Metadata> {
	const { slug } = await params;
	const product = await getProductBySlug({ slug, includeDraft: true });

	if (!product) {
		return {
			title: "Variantes - Administration",
		};
	}

	return {
		title: `Variantes de ${product.name} - Administration`,
		description: `Gérer les variantes du produit ${product.name}`,
	};
}

export default async function ProductVariantsPage({
	params,
	searchParams,
}: ProductVariantsPageProps) {
	await assertAdminPage();

	const [{ slug }, searchParamsData] = await Promise.all([params, searchParams]);

	// Parse and validate all search parameters safely
	const { cursor, direction, perPage, sortBy, search } =
		parseProductVariantParams(searchParamsData);

	// Parse les filtres
	const filters = parseVariantFilters(searchParamsData);

	/*
	 * Calculé une seule fois : l'expression était dupliquée trois fois plus bas
	 * (skeleton mobile, liste mobile) et la table desktop, elle, ne la recevait
	 * pas du tout — d'où un état vide desktop qui annonçait « Ce produit n'a pas
	 * encore de variante » et proposait d'en créer une alors qu'un filtre était
	 * actif. Seule table admin dans ce cas (audit « Système de feedback »).
	 */
	const hasActiveFilters =
		Boolean(search) ||
		Boolean(filters.stockStatus?.length) ||
		Boolean(filters.colorId?.length) ||
		Boolean(filters.materialId?.length) ||
		typeof filters.active === "boolean";

	// Récupérer le produit
	const product = await getProductBySlug({
		slug,
		includeDraft: true,
	});

	if (!product) {
		notFound();
	}

	// Les options de filtre sont awaited car nécessaires immédiatement
	const [colorOptions, materialOptions] = await Promise.all([
		getColorOptions(),
		getMaterialOptions(),
	]);

	// La promise de VARIANTs n'est PAS awaited pour permettre le streaming
	const variantsPromise = getProductVariants({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {
			productId: product.id,
			...filters,
		},
	});

	return (
		<div className={cn(ADMIN_LIST_GROUP_CLASS, "space-y-6")}>
			{/* ⚠️ Pas de `ResultCountLiveRegion` ici, contrairement aux 10 autres listes
				admin : `GetProductVariantsReturn` n'expose PAS de `totalCount` (curseur seul,
				cf. `modules/variants/types/variants.types.ts`). Annoncer la taille de la page
				courante serait faux dès qu'il y a plusieurs pages, et ajouter une requête
				de comptage à un endpoint volontairement streamé mérite son propre arbitrage
				perf. À traiter si `getProductVariants` gagne un total. Audit recherche 2026-07-26. */}

			{/* Dialogs des actions long-press / row-actions (delete, adjust-stock, update-price) */}
			<VariantsAdminDialogs />

			<VariantsBottomBar
				productSlug={slug}
				colorOptions={colorOptions}
				materialOptions={materialOptions}
			/>

			{/* Breadcrumb personnalise avec titre du produit */}
			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/produits">Produits</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href={`/admin/catalogue/produits/${slug}/modifier`}>
							{product.name}
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Variantes</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			{/* Rappel contextuel produit (mobile-only) — clarifie sur quel produit on est */}
			<VariantsProductContext product={product} />

			<PageHeader
				variant="compact"
				title={`Variantes de ${product.name}`}
				description="Gère les variantes de ce produit : couleur, matériau, taille."
				className="hidden md:block"
				actions={
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							render={<Link href={`/admin/catalogue/produits/${slug}/modifier`} />}
						>
							{/* `Pencil` et non `ArrowLeft` : c'est une action d'édition, pas un
								    retour — la flèche gauche annonçait un retour en arrière. */}
							<PencilSimpleIcon className="mr-2 size-4" />
							Modifier le produit
						</Button>
						<Button render={<Link href={`/admin/catalogue/produits/${slug}/variantes/nouveau`} />}>
							Nouvelle variante
						</Button>
					</div>
				}
			/>

			<div className="space-y-6">
				<Suspense fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} />}>
					<Toolbar
						className="hidden md:flex"
						ariaLabel="Barre d'outils de gestion des variantes"
						search={
							<SearchInput
								size="sm"
								paramName="search"
								placeholder="Rechercher une variante…"
								aria-label="Rechercher une variante"
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
							placeholder="Plus récentes"
							className="w-full sm:min-w-45"
							noPrefix
						/>
						<ButtonGroup aria-label="Filtres et actions">
							<FilterTriggerButton />
							<RefreshVariantsButton productId={product.id} />
						</ButtonGroup>
					</Toolbar>

					{/* Badges de filtres actifs (visible mobile + desktop) */}
					<VariantsFilterBadges colors={colorOptions} materials={materialOptions} />
				</Suspense>

				<Suspense fallback={<VariantsDataTableSkeleton />}>
					<ProductVariantsDataTable
						variantsPromise={variantsPromise}
						productSlug={slug}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>

				<Suspense fallback={<VariantsMobileListSkeleton hasActiveFilters={hasActiveFilters} />}>
					<VariantsMobileList
						variantsPromise={variantsPromise}
						productSlug={slug}
						perPage={perPage}
						hasActiveFilters={hasActiveFilters}
					/>
				</Suspense>
			</div>
		</div>
	);
}
