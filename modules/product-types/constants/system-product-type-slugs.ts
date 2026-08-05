/**
 * SSOT des slugs de types de produits « système » (`ProductType.isSystem`).
 *
 * ⚠️ Cette liste n'existait nulle part avant le 2026-08-05 : `prisma/seed.ts` portait
 * les 7 littéraux, et trois fichiers comparaient un slug à la main avec trois
 * conventions différentes (`=== "ring"`, `=== "rings" || === "ring"`,
 * `.includes("ring")`). Résultat : `PRODUCT_TYPES_REQUIRING_SIZE` valait
 * `["ring", "bracelet"]` quand la base disait `bagues` / `bracelets` — intersection
 * vide, donc `requiresSize` toujours faux, donc **aucun sélecteur de taille rendu**,
 * ni dans le dialog panier ni sur la fiche produit. On pouvait acheter une bague sans
 * jamais voir sa taille.
 *
 * Le seed importe ces valeurs (chemin relatif : il tourne sous `tsx` et n'utilise
 * aucun alias `@/`), donc la divergence redevient impossible par construction.
 *
 * ⚠️ La liste n'est PAS exhaustive à l'exécution : l'admin crée librement d'autres
 * types (`create-product-type.ts`), sans `isSystem`. Ne jamais l'utiliser pour valider
 * un slug entrant — seulement pour reconnaître les types que le produit connaît.
 */
export const SYSTEM_PRODUCT_TYPE_SLUGS = {
	NECKLACES: "colliers",
	BRACELETS: "bracelets",
	RINGS: "bagues",
	BODY_CHAINS: "chaines-corps",
	PAPILLOUX: "papilloux",
	HAIR_CHAINS: "chaines-cheveux",
	KEYRINGS: "porte-cles",
} as const;

export type SystemProductTypeSlug =
	(typeof SYSTEM_PRODUCT_TYPE_SLUGS)[keyof typeof SYSTEM_PRODUCT_TYPE_SLUGS];

/** Comparaison insensible à la casse contre un slug système (le slug vient de la DB). */
export function isProductType(
	slug: string | null | undefined,
	expected: SystemProductTypeSlug,
): boolean {
	return slug?.toLowerCase() === expected;
}
