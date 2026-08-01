/**
 * @regression catalogue-selects-media-filter
 *
 * Verrouille la règle « un média VIDEO ne doit jamais atteindre un champ qui exige une
 * IMAGE » au niveau des `select` Prisma du catalogue.
 *
 * ## La règle
 *
 * `SkuMedia` est polymorphe (`mediaType: IMAGE | VIDEO`). Deux familles de selects :
 *
 * - **vignette unique** — l'appelant prend `images[0]` et le passe à `<Image src>`. Le
 *   filtre `mediaType: "IMAGE"` doit être DANS le select : l'appelant n'a pas de quoi
 *   trier (il ne sélectionne même pas `mediaType`).
 * - **galerie** — l'appelant a besoin des vidéos. Le select ne filtre donc pas, mais il
 *   DOIT exposer `mediaType` pour que l'appelant puisse choisir (via `pickPrimaryImage`).
 *
 * Un select de la 1ʳᵉ famille sans filtre injecte un `.mp4` dans l'optimiseur d'images :
 * vignette cassée ET transformation `/_next/image` facturée. Un select de la 2ᵈᵉ famille
 * sans `mediaType` rend le tri impossible en aval, donc le défaut inévitable.
 *
 * ## L'historique
 *
 * L'audit « Images produit » du 2026-07-26 a appliqué le filtre à
 * `PRODUCT_CAROUSEL_SELECT` et aux 3 selects de `collection.constants.ts`, mais a manqué
 * `QUICK_SEARCH_SELECT` — qui portait `where: { isPrimary: true }` sans `mediaType`, et
 * ne sélectionnait pas `mediaType` non plus. Aucun garde-fou statique n'existait pour
 * cette règle : c'est ce trou qui a laissé le select dériver. D'où ce fichier.
 *
 * `where: { isPrimary: true }` est en outre banni à lui seul : sur un SKU sans média
 * primaire il rend 0 image alors que le SKU en a. Le tri
 * `[{ isPrimary: desc }, { position: asc }]` + `take: 1` donne le même résultat avec un
 * repli, et reproduit la priorité de `pickPrimaryImage`.
 *
 * ## Périmètre : ce fichier ne couvre QUE les selects du catalogue
 *
 * Il n'inspecte que des `select` exportés comme CONSTANTES. Deux selects soumis à la
 * même règle vivent en ligne dans une fonction et sont donc verrouillés ailleurs — s'y
 * référer avant de conclure qu'un chemin n'est pas gardé (audit « SKUs et variantes »
 * 2026-07-30, EINV-SNAPSHOT-MEDIA-001) :
 *
 * - `modules/cart/data/get-sku-for-validation.ts` — alimente le snapshot figé
 *   `OrderItem.productImageUrl` / `skuImageUrl` (facture, rétention 10 ans). C'était le
 *   SEUL select de sélection d'image du repo à ne pas même exposer `mediaType`, et il
 *   était hors de la liste de fichiers de ce test : c'est ce trou qui a permis à un
 *   `.mp4` d'atteindre un PDF de facture. Verrouillé par
 *   `modules/cart/data/__tests__/get-sku-for-validation.test.ts` (famille galerie :
 *   `mediaType` exposé + `orderBy` reproduisant `pickPrimaryImage`).
 * - `modules/materials/data/get-material.ts` — vignette unique, corrigée au même audit
 *   (elle portait `where: { isPrimary: true }` ET `where: { isDefault: true }`, les deux
 *   filtres bannis, sans `mediaType`).
 */
import { describe, expect, it } from "vitest";

import {
	GET_PRODUCT_SELECT,
	GET_PRODUCT_FOR_EDIT_SELECT,
	GET_PRODUCTS_SELECT,
	GET_PRODUCT_FOR_DUPLICATION_SELECT,
	PRODUCT_CAROUSEL_SELECT,
	QUICK_SEARCH_SELECT,
} from "../product.constants";
import {
	GET_COLLECTION_SELECT,
	GET_COLLECTION_STOREFRONT_SELECT,
	GET_COLLECTIONS_SELECT,
} from "@/modules/collections/constants/collection.constants";

type ImagesNode = { where?: Record<string, unknown>; select?: Record<string, unknown> };

/** Descend jusqu'au noeud `images` d'un select produit (skus → images). */
function productImagesNode(select: unknown): ImagesNode {
	const node = (select as { skus?: { select?: { images?: ImagesNode } } }).skus?.select?.images;
	if (!node) throw new Error("noeud skus.select.images introuvable");
	return node;
}

/** Idem via la table de jointure ProductCollection (products → product → skus → images). */
function collectionImagesNode(select: unknown): ImagesNode {
	const node = (
		select as {
			products?: {
				select?: { product?: { select?: { skus?: { select?: { images?: ImagesNode } } } } };
			};
		}
	).products?.select?.product?.select?.skus?.select?.images;
	if (!node) throw new Error("noeud products.product.skus.images introuvable");
	return node;
}

describe("selects catalogue — filtre média (@regression catalogue-selects-media-filter)", () => {
	// ─── Famille « vignette unique » : le filtre est obligatoire ────────────────

	const singleThumbnailSelects: Array<[string, ImagesNode]> = [
		["PRODUCT_CAROUSEL_SELECT", productImagesNode(PRODUCT_CAROUSEL_SELECT)],
		["QUICK_SEARCH_SELECT", productImagesNode(QUICK_SEARCH_SELECT)],
		["GET_COLLECTION_SELECT", collectionImagesNode(GET_COLLECTION_SELECT)],
		["GET_COLLECTION_STOREFRONT_SELECT", collectionImagesNode(GET_COLLECTION_STOREFRONT_SELECT)],
		["GET_COLLECTIONS_SELECT", collectionImagesNode(GET_COLLECTIONS_SELECT)],
	];

	it.each(singleThumbnailSelects)('%s filtre mediaType: "IMAGE"', (_name, images) => {
		expect(images.where).toMatchObject({ mediaType: "IMAGE" });
	});

	it.each(singleThumbnailSelects)(
		"%s ne filtre pas sur isPrimary seul (sinon 0 image quand aucune primaire)",
		(_name, images) => {
			expect(images.where).not.toHaveProperty("isPrimary");
		},
	);

	// ─── Famille « galerie » : pas de filtre, mais mediaType exposé ─────────────

	const gallerySelects: Array<[string, ImagesNode]> = [
		["GET_PRODUCT_SELECT", productImagesNode(GET_PRODUCT_SELECT)],
		["GET_PRODUCT_FOR_EDIT_SELECT", productImagesNode(GET_PRODUCT_FOR_EDIT_SELECT)],
		["GET_PRODUCTS_SELECT", productImagesNode(GET_PRODUCTS_SELECT)],
		["GET_PRODUCT_FOR_DUPLICATION_SELECT", productImagesNode(GET_PRODUCT_FOR_DUPLICATION_SELECT)],
	];

	it.each(gallerySelects)(
		"%s expose mediaType pour que l'appelant puisse trier (pickPrimaryImage)",
		(_name, images) => {
			expect(images.select).toMatchObject({ mediaType: true });
		},
	);

	// Garde-fou du garde-fou : si les helpers de navigation renvoyaient un objet vide
	// au lieu de lever, toutes les assertions `toMatchObject` ci-dessus passeraient au
	// vert sans rien vérifier. On prouve donc qu'un chemin absent lève bien.
	it("les helpers de navigation lèvent sur un select sans noeud images", () => {
		expect(() => productImagesNode({ id: true })).toThrow(/introuvable/);
		expect(() => collectionImagesNode({ id: true })).toThrow(/introuvable/);
	});
});
