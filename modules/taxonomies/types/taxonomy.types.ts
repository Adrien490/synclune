/**
 * Types partagés des taxonomies catalogue (couleurs, matériaux, types de bijoux).
 *
 * Ces trois entités sont des tables d'étiquettes : un nom, un slug, une
 * description, un drapeau actif, et un compteur d'usage. Elles avaient trois
 * implémentations parallèles qui ont dérivé (deux façons d'écrire le même hook
 * de suppression, par exemple). Ce module porte la forme commune ; les écarts
 * réels — le `hex` d'une couleur, le `isSystem` d'un type, le libellé de l'unité
 * comptée — vivent dans le registre `taxonomy.config.ts`.
 */

export type TaxonomyKind = "color" | "material" | "product-type";

/** Libellés français d'une taxonomie, pour composer les textes d'interface. */
interface TaxonomyLabels {
	/** « couleur » */
	singular: string;
	/** « couleurs » */
	plural: string;
	/** « une couleur » — article indéfini accordé. */
	indefinite: string;
	/** « la couleur » — article défini accordé. */
	definite: string;
	/** « Couleur » — forme capitalisée pour les titres. */
	capitalized: string;
	/** « Couleurs » — forme capitalisée plurielle. */
	capitalizedPlural: string;
	/** Genre grammatical, pour accorder les participes (« supprimée » vs « supprimé »). */
	feminine: boolean;
}

/** Unité comptée par le champ `_count` de la taxonomie. */
interface TaxonomyUsageLabels {
	/** « variante » / « produit » */
	singular: string;
	/** « variantes » / « produits » */
	plural: string;
}

export interface TaxonomyConfig {
	kind: TaxonomyKind;
	labels: TaxonomyLabels;
	usage: TaxonomyUsageLabels;
	/** Racine admin, sans slash final : `/admin/catalogue/couleurs`. */
	basePath: string;
	/** Identifiant du dialog de création/édition (store dialog partagé). */
	formDialogId: string;
	/** Identifiant du dialog de confirmation de suppression. */
	deleteDialogId: string;
	/** Libellés du tri, indexés par valeur de `sortBy`. */
	sortLabels: Readonly<Record<string, string>>;
	/** Valeur de `sortBy` appliquée par défaut. */
	defaultSort: string;
	/** Préfixe des identifiants de drawer admin (filtres, tri). */
	drawerNamespace: string;
	/**
	 * Noms de champs `FormData` attendus par les Server Actions.
	 *
	 * Ils ont dérivé entre les trois modules : la duplication attend `colorId` /
	 * `materialId` / `productTypeId`, et le toggle de statut attend `id` sauf
	 * pour les types de bijoux qui attendent `productTypeId`. Plutôt que de
	 * réécrire six actions et leurs schémas Zod (risque sans bénéfice), le
	 * registre porte l'écart et les hooks génériques s'y conforment.
	 */
	formFields: {
		duplicateId: string;
		toggleId: string;
		/** Champ portant l'id dans le formulaire de suppression. */
		deleteId: string;
	};
	/** Libellé du bouton de création (« Créer une couleur », « Créer un type »). */
	createButtonLabel: string;
	/** Titre du dialog de suppression, s'il diffère du libellé par défaut. */
	deleteDialogTitle?: string;
	/** Copie de la barre de recherche mobile (placeholder + label accessible). */
	search: { placeholder: string; ariaLabel: string };
	/** Label accessible du bouton « Ajouter » de la barre mobile. */
	createAriaLabel: string;
	/** La taxonomie porte une couleur hexadécimale (couleurs uniquement). */
	hasHex: boolean;
	/** La taxonomie porte un drapeau « système » non supprimable (types uniquement). */
	hasSystemFlag: boolean;
}
