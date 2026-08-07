import type { CSSProperties } from "react";

import { getCollectionPriceRanges } from "@/modules/collections/data/get-collection-price-ranges";
import type { GetCollectionsReturn } from "@/modules/collections/data/get-collections";

import { CollectionsCard, CollectionsCardSkeleton } from "./collections-card";

/**
 * Nombre de collections montrées sur la landing.
 *
 * 4 — une rangée pleine à `lg` (4 colonnes), deux rangées pleines en mobile
 * (2 colonnes) : le compte de cellules tombe juste aux deux largeurs, même
 * logique que `HERO_PRODUCTS_COUNT`. Si le catalogue en publie moins, la
 * rangée reste incomplète — c'est le comportement normal d'une grille de
 * cartes, pas un état à combler.
 */
export const LANDING_COLLECTIONS_COUNT = 4;

/** Décalage de la cascade d'entrée, en % de la plage `entry` (cf. entrance.css). */
const ENTER_STAGGER_STEP_PCT = 6;
const ENTER_STAGGER_MAX_PCT = 24;

function cellStyle(index: number): CSSProperties {
	return {
		"--enter-y": "20px",
		"--enter-stagger": `${Math.min(index * ENTER_STAGGER_STEP_PCT, ENTER_STAGGER_MAX_PCT)}%`,
	} as CSSProperties;
}

/**
 * Cellules de la grille « Choisis ton univers » — rendues DANS le `<ul>` de
 * `CollectionsSection` (un fragment et une frontière `Suspense` ne produisent
 * aucun nœud DOM, donc les `<li>` restent des enfants directs de la liste).
 *
 * @description
 * Pas de branche d'erreur : `getCollections` ne remonte pas de champ `error` —
 * une entrée invalide rend `{ collections: [] }`, et c'est la branche vide qui
 * la couvre. Même contrat que `CollectionChapters` sur `/collections`.
 *
 * La branche vide garde le langage de la page (note d'atelier, comme
 * `HeroEmptyCard`) plutôt que de masquer la section : le titre est rendu
 * statiquement hors de la frontière `Suspense` — le même arbitrage que le
 * `<h1>` de l'étal, transposé au `h2` — donc la section ne peut de toute
 * façon pas disparaître avec ses données. Cas réel : zéro collection publiée
 * ayant des produits, c'est-à-dire une boutique qui vient d'ouvrir.
 */
export async function CollectionsGrid({
	collectionsPromise,
}: {
	collectionsPromise: Promise<GetCollectionsReturn>;
}) {
	const { collections } = await collectionsPromise;

	if (collections.length === 0) {
		return (
			<li className="enter-inview col-span-2 lg:col-span-4" style={cellStyle(0)}>
				<div className="border-border rounded-md border-2 border-dashed px-5 py-8 text-center sm:px-8 sm:py-10">
					<p className="font-display text-xl font-normal sm:text-2xl">
						Les premières séries s&apos;assemblent sur l&apos;établi
					</p>
					<p className="text-muted-foreground mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed">
						Chaque bijou rejoindra bientôt son univers — en attendant, tu peux déjà fouiller toutes
						les créations.
					</p>
				</div>
			</li>
		);
	}

	// UNE requête agrégée cachée (profil catalog) pour toutes les cartes — même
	// discipline que `CollectionChapters` sur /collections, jamais un fetch par
	// carte. La fourchette peut manquer (produits publiés sans SKU actif) : la
	// carte omet alors sa ligne prix.
	const priceRanges = await getCollectionPriceRanges(collections.map((c) => c.id));

	return (
		<>
			{collections.map((collection, index) => (
				<li key={collection.id} className="enter-inview" style={cellStyle(index)}>
					<CollectionsCard collection={collection} priceRange={priceRanges[collection.id]} />
				</li>
			))}
		</>
	);
}

/**
 * Fallback de `CollectionsGrid` — même nombre de cellules, mêmes dimensions.
 * La disparité avec la branche vide (4 cellules contre 1) est le MÊME
 * non-problème que sur l'étal : tout ce qui suit la section commence hors
 * viewport, et le CLS ne compte que les éléments visibles qui se déplacent
 * (mesuré le 2026-08-05, cf. JSDoc de `HeroGridSkeleton`).
 */
export function CollectionsGridSkeleton() {
	return (
		<>
			{Array.from({ length: LANDING_COLLECTIONS_COUNT }, (_, index) => (
				<li key={index}>
					<CollectionsCardSkeleton />
				</li>
			))}
		</>
	);
}
