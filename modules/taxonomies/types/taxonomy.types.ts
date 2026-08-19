/**
 * Types partagés des taxonomies catalogue (couleurs, matériaux, types de bijoux).
 *
 * Ces entités sont des tables d'étiquettes : un nom (+ hex pour les couleurs),
 * une position, et un compteur d'usage. Elles avaient des implémentations
 * parallèles qui ont dérivé (deux façons d'écrire le même hook de suppression,
 * par exemple). Ce module porte la forme commune ; les écarts réels — le
 * libellé de l'unité comptée, le filtre disponible — vivent dans le registre
 * `taxonomy.config.ts`.
 */

/**
 * ⚠️ **Tout composant monté depuis un Server Component prend un `kind`, jamais
 * l'objet `config`.**
 *
 * Un `TaxonomyConfig` passé en prop y traverserait la frontière RSC — une
 * vingtaine de champs sérialisés à chaque rendu, pour une valeur que le client
 * peut lire seul dans le registre. Le `kind` fait cinq caractères sur le fil.
 *
 * C'est aussi ce qui a permis de supprimer les fichiers-liants d'un composant
 * (`colors-bottom-bar.tsx` et ses quatorze jumeaux, 8 à 13 lignes chacun) dont
 * le corps entier était `return <Taxonomy… config={TAXONOMY_CONFIG.x} />`.
 *
 * Les autres composants prennent l'objet, sans coût de sérialisation :
 * les composants **serveur** (`TaxonomyMobileList`, `TaxonomyDetailLayout`)
 * parce que rien ne quitte le serveur, et les composants clients montés depuis
 * des fichiers `"use client"` (`TaxonomyDeleteAlertDialog`,
 * `TaxonomyDetailHeader`, `RefreshTaxonomyButton`…) parce que la frontière est
 * déjà derrière eux — leur monteur lit `TAXONOMY_CONFIG` côté client.
 */
export type TaxonomyKind = "color" | "material" | "product-type";

/** Libellés français d'une taxonomie, pour composer les textes d'interface. */
interface TaxonomyLabels {
	/** « couleur » */
	singular: string;
	/** « couleurs » */
	plural: string;
	/** « la couleur » — article défini accordé. */
	definite: string;
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

/** Une option de filtre. La PREMIÈRE d'une définition est la valeur neutre. */
interface TaxonomyFilterOption {
	/** Valeur écrite telle quelle dans l'URL — sauf la neutre, qui efface le param. */
	value: string;
	label: string;
}

/**
 * Un filtre exposé par la feuille de filtres.
 *
 * ⚠️ **Une définition n'existe que si une PAGE parse le paramètre.** Le module
 * a vécu six mois avec une feuille « Statut actif » qui écrivait
 * `filter_isActive` sur les trois listes, alors que la migration lean avait
 * retiré la colonne `active` des trois modèles et qu'aucune page ne lisait le
 * paramètre : le filtre ne filtrait rien, le badge affichait `isActive : true`,
 * et `hasActiveFilters` basculait — l'état vide annonçait « ne correspond aux
 * critères » pour une liste qu'aucun critère n'avait touchée. Verrouillé par
 * `taxonomy-filters.regression.test.ts`.
 */
interface TaxonomyFilterDefinition {
	/** Suffixe du paramètre d'URL : `param: "hasProducts"` → `filter_hasProducts`. */
	param: string;
	/** Légende du groupe de radios dans la feuille. */
	legend: string;
	/** Libellé du badge de filtre actif (« Produits »). */
	badgeLabel: string;
	/** Options du groupe ; `options[0]` est la valeur neutre (« Tous »). */
	options: ReadonlyArray<TaxonomyFilterOption>;
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
	 * Filtres exposés par la liste. **Vide = pas de surface de filtre du tout** :
	 * ni bouton « Filtrer » dans la barre basse, ni `FilterTriggerButton` dans la
	 * barre d'outils, ni badges. Une table d'étiquettes de trente lignes se
	 * navigue à la recherche et au tri.
	 */
	filters: ReadonlyArray<TaxonomyFilterDefinition>;
	/**
	 * Noms de champs `FormData` attendus par les Server Actions.
	 *
	 * Ils ont dérivé entre les modules : la duplication attend `colorId` /
	 * `materialId`. Plutôt que de réécrire les actions et leurs schémas Zod
	 * (risque sans bénéfice), le registre porte l'écart et les hooks génériques
	 * s'y conforment.
	 */
	formFields: {
		duplicateId: string;
		/** Champ portant l'id dans le formulaire de suppression. */
		deleteId: string;
	};
	/** Libellé du bouton de création (« Créer une couleur », « Créer un type »). */
	createButtonLabel: string;
	/**
	 * Titre du dialog de suppression.
	 *
	 * ⚠️ **Requis, et ce n'est pas une coquetterie.** Il a été optionnel, avec
	 * l'idée d'un « défaut » qui n'existait plus depuis la migration vers
	 * `ConfirmDialog` : `title` y est déclaré `ReactNode`, dont `undefined` est
	 * un membre valide — `tsc` ne voyait rien, et les dialogs de suppression des
	 * couleurs et des matériaux se rendaient sans titre visible ET sans nom
	 * accessible (`aria-labelledby` pointant sur un nœud vide).
	 */
	deleteDialogTitle: string;
	/** Copie de la barre de recherche mobile (placeholder + label accessible). */
	search: { placeholder: string; ariaLabel: string };
	/** Label accessible du bouton « Ajouter » de la barre mobile. */
	createAriaLabel: string;
}
