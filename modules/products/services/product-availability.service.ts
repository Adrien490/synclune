/**
 * Disponibilité d'un produit de liste — logique PURE, sans DB ni effet de bord.
 */
import type { GetProductsReturn } from "../types/product.types";

type ProductFromList = GetProductsReturn["products"][number];

/**
 * Un produit est épuisé quand la somme des stocks de ses SKUs ACTIFS vaut zéro.
 *
 * ⚠️ Même règle que `getProductCardData` (`product-display.service.ts`), qui juge
 * la rupture sur l'AGRÉGAT et non sur le SKU affiché : trois couleurs à un
 * exemplaire ne sont pas une rupture. Les deux doivent rester d'accord — sinon le
 * classement pousserait en fin une pièce que la carte présente comme achetable, ou
 * l'inverse.
 *
 * Un produit sans aucun SKU actif (« à venir ») compte comme épuisé : il n'offre
 * pas d'achat, et c'est le seul critère qui compte ici.
 */
export function isSoldOut(product: ProductFromList): boolean {
	const activeInventory = product.skus
		.filter((sku) => sku.isActive)
		.reduce((total, sku) => total + sku.inventory, 0);
	return activeInventory === 0;
}

/**
 * Réordonne une liste pour que ses premières pièces couvrent le plus de
 * TYPES de bijou possible, sans jamais casser l'ordre d'entrée à couverture égale.
 *
 * ## Pourquoi ça existe
 *
 * Le premier écran demandait ses pièces par récence pure. Mesuré le 2026-08-06 sur
 * le catalogue servi : les cinq cellules rendaient **trois « Papilloux » et deux
 * « Chaîne de corps »** — ni bague, ni bracelet, ni collier, alors que ces trois
 * familles pèsent 12 des 20 pièces de la première page du catalogue.
 *
 * C'est le défaut nº 1 documenté d'une page d'accueil marchande : Baymard mesure
 * que **22 % des sites montrent trop peu de types**, et que les visiteuses qui ne
 * voient pas le type qu'elles cherchent **en concluent qu'il n'est pas vendu** et
 * partent. La home doit donner à voir 40-50 % des types du catalogue.
 *
 * ⚠️ C'est un défaut de **mécanisme**, pas de jeu de données : une fournée de cinq
 * paires de boucles ajoutées le même jour le reproduit à l'identique sur le vrai
 * catalogue. Le corriger dans la requête est impossible — Prisma n'a pas de
 * « distinct on » utilisable ici — d'où ce passage en mémoire sur une lecture
 * sur-allouée.
 *
 * ## L'algorithme, et ce qu'il préserve
 *
 * Un seul parcours par vague : on prend la première pièce de chaque type encore
 * inédit, puis on recommence sur le reste. Une pièce sans type compte comme son
 * propre groupe (`null`), pour ne jamais être écartée.
 *
 * Conséquences voulues :
 * - à couverture égale, **la récence décide** — la vague 1 est dans l'ordre reçu ;
 * - le résultat contient **toujours** tous les éléments d'entrée, jamais moins :
 *   l'appelant coupe après, et une boutique mono-type continue d'afficher cinq
 *   pièces ;
 * - la fonction ne connaît **pas** `limit` : elle réordonne, elle ne tronque pas.
 *   C'est ce qui la garde composable avec `sortSoldOutLast`.
 *
 * ⚠️ **À appliquer APRÈS `sortSoldOutLast`, et par partition.** L'inverse ferait
 * remonter une pièce épuisée devant une pièce achetable au motif que son type est
 * rare — or n'offrir aucun achat au premier écran est le défaut que
 * `sortSoldOutLast` existe pour empêcher. La disponibilité prime sur la variété.
 */
export function interleaveByType<T extends ProductFromList>(products: readonly T[]): T[] {
	const byType = new Map<string, T[]>();
	for (const product of products) {
		// Une pièce sans type ne se fond pas avec les autres : chacune forme son
		// propre groupe, sinon toutes les pièces non typées se retrouveraient en
		// concurrence pour une seule place.
		const key = product.type?.id ?? `untyped:${product.id}`;
		const bucket = byType.get(key);
		if (bucket) bucket.push(product);
		else byType.set(key, [product]);
	}

	// `Map` préserve l'ordre d'insertion : la première vague sort donc dans l'ordre
	// d'apparition des types, c'est-à-dire par récence.
	const buckets = [...byType.values()];
	const ordered: T[] = [];
	for (let round = 0; ordered.length < products.length; round++) {
		for (const bucket of buckets) {
			const item = bucket[round];
			if (item) ordered.push(item);
		}
	}
	return ordered;
}

/**
 * Le classement du premier écran, en une fonction : **disponibilité d'abord,
 * variété de types ensuite**.
 *
 * ## Critère 1 — les pièces épuisées passent à la fin
 *
 * Le premier écran demande les créations les plus récentes, sans aucun critère de
 * stock. Sur un catalogue de pièces UNIQUES, l'épuisé est l'état terminal de
 * chaque pièce et non un cas de bord : dès que les nouveautés s'espacent, la home
 * peut n'afficher que des voiles « Rupture de stock » — et une carte épuisée perd
 * son bouton d'ajout au panier. Le premier écran n'offrirait alors AUCUN achat
 * (audit du premier écran, 2026-08-05).
 *
 * **Réordonner et non filtrer**, pour deux raisons : filtrer masquerait les
 * nouveautés, qui sont précisément le sujet de la section, et une pièce épuisée
 * est un signal de désirabilité, pas un déchet ; et
 * `productFiltersSchema.stockStatus` n'accepte qu'UNE valeur d'enum, donc pas
 * « in_stock OU low_stock » — filtrer côté requête aurait aussi écarté les pièces
 * à faible stock, celles qu'il faut montrer en premier.
 *
 * ## Critère 2 — étaler les types (cf. `interleaveByType`)
 *
 * ⚠️ **L'ordre des deux critères n'est pas interchangeable.** Diversifier avant de
 * partitionner ferait remonter une pièce épuisée devant une pièce achetable au
 * motif que son type est rare — soit exactement le défaut que le critère 1 existe
 * pour empêcher. La disponibilité prime sur la variété.
 *
 * ## Pourquoi une seule fonction
 *
 * Pour que l'ordre soit calculé à UN seul endroit. La promesse produits de
 * l'accueil est partagée entre la grille et l'`ItemList` du JSON-LD : réordonner
 * dans la grille seule ferait annoncer à Google un ordre que la page ne rend pas.
 *
 * L'appelant sur-alloue sa lecture, appelle ceci, puis coupe : le nombre de
 * cellules ne change pas (c'est lui qui fait tomber juste les rangées aux trois
 * largeurs) et une boutique entièrement épuisée continue de montrer cinq pièces.
 */
export function orderHeroProducts<T extends ProductFromList>(products: readonly T[]): T[] {
	const available: T[] = [];
	const soldOut: T[] = [];
	for (const product of products) {
		(isSoldOut(product) ? soldOut : available).push(product);
	}
	// Diversification DANS chaque partition — cf. l'avertissement d'ordre ci-dessus.
	return [...interleaveByType(available), ...interleaveByType(soldOut)];
}
