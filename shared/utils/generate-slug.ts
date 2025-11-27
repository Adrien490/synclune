import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * Génère un slug unique en kebab-case pour les modèles supportés.
 *
 * @param prisma - Instance du client Prisma
 * @param model - Type de modèle supporté
 * @param value - Chaîne à convertir en slug
 * @returns Promise<string> - Slug unique généré
 *
 * @example
 * ```typescript
 * // Exemples d'utilisation
 * await generateSlug(prisma, "product", "Bague en Argent 925") // → "bague-en-argent-925"
 * await generateSlug(prisma, "collection", "Été 2024 - Édition Limitée") // → "ete-2024-edition-limitee"
 * await generateSlug(prisma, "productType", "Colliers") // → "colliers"
 *
 * // Si le slug existe déjà
 * await generateSlug(prisma, "product", "Bague Minimaliste") // → "bague-minimaliste-2"
 * ```
 */
export async function generateSlug(
	prisma: PrismaClient,
	model: "product" | "collection" | "productType" | "color",
	value: string
): Promise<string> {
	if (!value || typeof value !== "string" || value.trim().length === 0) {
		throw new Error("La valeur pour générer le slug ne peut pas être vide");
	}

	// Générer le slug de base
	const baseSlug = slugifyFR(value);

	// Tronquer si trop long (garde de la place pour le suffixe)
	const maxLength = 70;
	const truncatedSlug =
		baseSlug.length > maxLength
			? baseSlug.substring(0, maxLength).replace(/-+$/, "")
			: baseSlug;

	// Vérifier l'unicité et ajouter un suffixe si nécessaire
	let finalSlug = truncatedSlug;
	let counter = 1;

	while (true) {
		let existing;

		// Vérification spécifique par modèle
		switch (model) {
			case "product":
				existing = await prisma.product.findUnique({
					where: { slug: finalSlug },
					select: { id: true },
				});
				break;
			case "collection":
				existing = await prisma.collection.findUnique({
					where: { slug: finalSlug },
					select: { id: true },
				});
				break;
			case "productType":
				existing = await prisma.productType.findUnique({
					where: { slug: finalSlug },
					select: { id: true },
				});
				break;
			case "color":
				existing = await prisma.color.findUnique({
					where: { slug: finalSlug },
					select: { id: true },
				});
				break;
		}

		if (!existing) {
			return finalSlug;
		}

		counter++;
		finalSlug = `${truncatedSlug}-${counter}`;
	}
}

/**
 * Convertit une chaîne en slug français (kebab-case) avec gestion des accents.
 *
 * @param input - Chaîne à convertir
 * @returns Slug normalisé
 *
 * @internal
 */
function slugifyFR(input: string): string {
	return (
		input
			.trim()
			// Normalisation NFD pour séparer les caractères de leurs accents
			.normalize("NFD")
			// Suppression des diacritiques (accents)
			.replace(/[\u0300-\u036f]/g, "")
			// Conversion en minuscules
			.toLowerCase()
			// Remplacement des caractères spéciaux français
			.replace(/[œ]/g, "oe")
			.replace(/[æ]/g, "ae")
			.replace(/[ç]/g, "c")
			// Remplacement des espaces et caractères non-alphanumériques par des tirets
			.replace(/[^a-z0-9]+/g, "-")
			// Suppression des tirets multiples
			.replace(/-+/g, "-")
			// Suppression des tirets en début et fin
			.replace(/^-+|-+$/g, "")
	);
}
