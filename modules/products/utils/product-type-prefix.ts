/**
 * Préfixe un titre de bijou par son type — sans le répéter quand le titre le
 * nomme déjà.
 *
 * Les libellés de type sont au **pluriel** (« Colliers », « Bagues », « Chaînes
 * de cheveux ») et les titres du catalogue commencent par le **singulier**
 * (« Collier Lune Céleste », « Chaîne de Cheveux Bohème »). Préfixer sans
 * regarder produisait, dans le texte alternatif de chaque photo de la galerie :
 *
 *     « Colliers Collier Lune Céleste en Plaqué or Or rose - Vue 3 sur 7 »
 *
 * — un doublon que seule une lecture au lecteur d'écran révèle.
 */

/** Retire les accents pour comparer « Chaînes » et « chaine ». */
function deaccent(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");
}

/**
 * Premier mot, désaccentué, privé de sa marque de pluriel française
 * (« colliers » → « collier », « papilloux » → « papillou »).
 */
function singularFirstWord(value: string): string {
	const [first = ""] = deaccent(value.trim()).split(/\s+/);
	return first.replace(/[sx]$/, "");
}

export function prefixWithProductType(title: string, productType?: string | null): string {
	if (!productType) return title;

	const typeWord = singularFirstWord(productType);
	if (typeWord.length > 0 && typeWord === singularFirstWord(title)) return title;

	return `${productType} ${title}`;
}
