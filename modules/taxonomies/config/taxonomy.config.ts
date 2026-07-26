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
 * Tout ce qui distingue réellement une couleur d'un matériau ou d'un type de
 * bijou est ici, en données. Les composants et hooks génériques du module lisent
 * ce registre — ils n'ont aucune connaissance des entités concrètes.
 *
 * Les libellés de tri restent per-kind : ce ne sont pas des variantes du même
 * texte mais des jeux d'options réellement différents (les matériaux trient
 * aussi par date de création, les types comptent des produits et non des
 * variantes).
 */
export const TAXONOMY_CONFIG: Readonly<Record<TaxonomyKind, TaxonomyConfig>> = {
	color: {
		kind: "color",
		labels: {
			singular: "couleur",
			plural: "couleurs",
			indefinite: "une couleur",
			definite: "la couleur",
			capitalized: "Couleur",
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
		formFields: { duplicateId: "colorId", toggleId: "id", deleteId: "id" },
		createButtonLabel: "Créer une couleur",
		createAriaLabel: "Créer une nouvelle couleur",
		search: {
			placeholder: "Une teinte de l'atelier…",
			ariaLabel: "Rechercher une teinte de l'atelier",
		},
		hasHex: true,
		hasSystemFlag: false,
	},
	material: {
		kind: "material",
		labels: {
			singular: "matériau",
			plural: "matériaux",
			indefinite: "un matériau",
			definite: "le matériau",
			capitalized: "Matériau",
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
		formFields: { duplicateId: "materialId", toggleId: "id", deleteId: "id" },
		createButtonLabel: "Créer un matériau",
		createAriaLabel: "Créer un nouveau matériau",
		search: {
			placeholder: "Une matière à l'atelier…",
			ariaLabel: "Rechercher une matière à l'atelier",
		},
		hasHex: false,
		hasSystemFlag: false,
	},
	"product-type": {
		kind: "product-type",
		labels: {
			singular: "type de bijou",
			plural: "types de bijoux",
			indefinite: "un type de bijou",
			definite: "le type de bijou",
			capitalized: "Type de bijou",
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
		formFields: {
			duplicateId: "productTypeId",
			toggleId: "productTypeId",
			deleteId: "productTypeId",
		},
		createButtonLabel: "Créer un type",
		createAriaLabel: "Créer un nouveau type de bijou",
		search: {
			placeholder: "Label, slug…",
			ariaLabel: "Rechercher un type de bijou",
		},
		deleteDialogTitle: "Supprimer ce type de bijou ?",
		hasHex: false,
		hasSystemFlag: true,
	},
} as const;

export function getTaxonomyConfig(kind: TaxonomyKind): TaxonomyConfig {
	return TAXONOMY_CONFIG[kind];
}

/**
 * Accorde un adjectif ou un participe passé au genre de la taxonomie.
 *
 * `agree(config, "supprimé")` → « supprimée » pour une couleur.
 * `agree(config, "Actif")`    → « Active »   pour une couleur.
 *
 * Couvre le cas régulier (ajout d'un « e ») et la terminaison en « -if », la
 * seule irrégularité rencontrée dans ces libellés. Toute autre irrégularité
 * (« -eux » → « -euse », « -er » → « -ère »…) doit être écrite en toutes
 * lettres dans le registre plutôt qu'ajoutée ici : mieux vaut une donnée
 * explicite qu'un moteur de morphologie approximatif.
 */
export function agree(config: TaxonomyConfig, masculine: string): string {
	if (!config.labels.feminine) return masculine;
	if (masculine.endsWith("if")) return `${masculine.slice(0, -2)}ive`;
	return `${masculine}e`;
}

/**
 * Compose « 3 variantes » / « 1 produit » en accordant le pluriel.
 */
export function formatUsage(config: TaxonomyConfig, count: number): string {
	const noun = count > 1 ? config.usage.plural : config.usage.singular;
	return `${count} ${noun}`;
}
