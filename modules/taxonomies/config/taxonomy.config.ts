import {
	COLORS_SORT_LABELS,
	GET_COLORS_DEFAULT_SORT_BY,
} from "@/modules/colors/constants/color.constants";
import {
	MATERIALS_SORT_LABELS,
	GET_MATERIALS_DEFAULT_SORT_BY,
} from "@/modules/materials/constants/materials.constants";
import {
	PRODUCT_TYPES_SORT_LABELS,
	GET_PRODUCT_TYPES_DEFAULT_SORT_BY,
} from "@/modules/product-types/constants/product-type.constants";

import type { TaxonomyConfig, TaxonomyKind } from "../types/taxonomy.types";

/**
 * Registre des taxonomies catalogue.
 *
 * Tout ce qui distingue réellement une couleur d'un matériau est ici, en
 * données. Les composants et hooks génériques du module lisent ce registre —
 * ils n'ont aucune connaissance des entités concrètes.
 */
export const TAXONOMY_CONFIG: Readonly<Record<TaxonomyKind, TaxonomyConfig>> = {
	color: {
		kind: "color",
		labels: {
			singular: "couleur",
			plural: "couleurs",
			definite: "la couleur",
			capitalizedPlural: "Couleurs",
			feminine: true,
		},
		usage: { singular: "variante", plural: "variantes" },
		basePath: "/admin/catalogue/couleurs",
		formDialogId: "color-form",
		deleteDialogId: "delete-color",
		sortLabels: COLORS_SORT_LABELS,
		defaultSort: GET_COLORS_DEFAULT_SORT_BY,
		drawerNamespace: "colors",
		// Le schéma lean ne laisse à Color que { id, name, hex?, position } :
		// aucune colonne n'est filtrable. Recherche + tri.
		filters: [],
		formFields: { duplicateId: "colorId", deleteId: "id" },
		createButtonLabel: "Créer une couleur",
		createAriaLabel: "Créer une nouvelle couleur",
		deleteDialogTitle: "Supprimer cette couleur ?",
		search: {
			placeholder: "Une teinte de l'atelier…",
			ariaLabel: "Rechercher une teinte de l'atelier",
		},
	},
	material: {
		kind: "material",
		labels: {
			singular: "matériau",
			plural: "matériaux",
			definite: "le matériau",
			capitalizedPlural: "Matériaux",
			feminine: false,
		},
		usage: { singular: "variante", plural: "variantes" },
		basePath: "/admin/catalogue/materiaux",
		formDialogId: "material-form",
		deleteDialogId: "delete-material",
		sortLabels: MATERIALS_SORT_LABELS,
		defaultSort: GET_MATERIALS_DEFAULT_SORT_BY,
		drawerNamespace: "materials",
		// Idem Color : { id, name, position }, rien à filtrer.
		filters: [],
		formFields: { duplicateId: "materialId", deleteId: "id" },
		createButtonLabel: "Créer un matériau",
		createAriaLabel: "Créer un nouveau matériau",
		deleteDialogTitle: "Supprimer ce matériau ?",
		search: {
			placeholder: "Une matière à l'atelier…",
			ariaLabel: "Rechercher une matière à l'atelier",
		},
	},
	"product-type": {
		kind: "product-type",
		labels: {
			singular: "type de bijou",
			plural: "types de bijoux",
			definite: "le type de bijou",
			capitalizedPlural: "Types de bijoux",
			feminine: false,
		},
		usage: { singular: "produit", plural: "produits" },
		basePath: "/admin/catalogue/types-de-produits",
		formDialogId: "product-type-form",
		deleteDialogId: "delete-product-type",
		sortLabels: PRODUCT_TYPES_SORT_LABELS,
		defaultSort: GET_PRODUCT_TYPES_DEFAULT_SORT_BY,
		drawerNamespace: "product-types",
		// Le SEUL filtre que la couche data sait appliquer à un type de bijou
		// (`buildProductTypeFilterConditions`), et le seul que sa page parse
		// (`types-de-produits/_utils/params.ts`).
		filters: [
			{
				param: "hasProducts",
				legend: "Bijoux rattachés",
				badgeLabel: "Bijoux",
				options: [
					{ value: "all", label: "Tous" },
					{ value: "true", label: "Avec bijoux" },
					{ value: "false", label: "Sans bijou" },
				],
			},
		],
		formFields: {
			duplicateId: "productTypeId",
			deleteId: "productTypeId",
		},
		createButtonLabel: "Créer un type",
		createAriaLabel: "Créer un nouveau type de bijou",
		deleteDialogTitle: "Supprimer ce type de bijou ?",
		search: {
			placeholder: "Label, slug…",
			ariaLabel: "Rechercher un type de bijou",
		},
	},
} as const;
