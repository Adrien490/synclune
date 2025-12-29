import type { PrismaClient } from "@/app/generated/prisma/client";
import {
	DIACRITICS_PATTERN,
	FRENCH_LIGATURES,
	NON_ALPHANUMERIC_PATTERN,
	MULTIPLE_DASHES_PATTERN,
	LEADING_TRAILING_DASHES_PATTERN,
	SLUG_MAX_LENGTH,
} from "@/shared/constants/slug-patterns";

/**
 * Type pour le client Prisma ou un client de transaction
 * Compatible avec $transaction() où certaines méthodes sont omises
 */
type PrismaClientOrTransaction = Pick<
	PrismaClient,
	"product" | "collection" | "productType" | "color" | "material"
>;

/**
 * Génère un slug unique en kebab-case pour les modèles supportés.
 *
 * @param prisma - Instance du client Prisma ou client de transaction
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
 *
 * // Peut être utilisé dans une transaction
 * const product = await prisma.$transaction(async (tx) => {
 *   const slug = await generateSlug(tx, "product", "Nouveau Produit");
 *   return tx.product.create({ data: { slug, ... } });
 * });
 * ```
 */
export async function generateSlug(
	prisma: PrismaClientOrTransaction,
	model: "product" | "collection" | "productType" | "color" | "material",
	value: string
): Promise<string> {
	if (!value || typeof value !== "string" || value.trim().length === 0) {
		throw new Error("La valeur pour générer le slug ne peut pas être vide");
	}

	// Générer le slug de base
	const baseSlug = slugify(value);

	// Tronquer si trop long (garde de la place pour le suffixe)
	const truncatedSlug =
		baseSlug.length > SLUG_MAX_LENGTH
			? baseSlug.substring(0, SLUG_MAX_LENGTH).replace(/-+$/, "")
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
			case "material":
				existing = await prisma.material.findUnique({
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
 * @example
 * ```typescript
 * slugify("Or rose") // → "or-rose"
 * slugify("Argent 925") // → "argent-925"
 * slugify("Été 2024") // → "ete-2024"
 * ```
 */
export function slugify(input: string): string {
	return (
		input
			.trim()
			// Normalisation NFD pour séparer les caractères de leurs accents
			.normalize("NFD")
			// Suppression des diacritiques (accents)
			.replace(DIACRITICS_PATTERN, "")
			// Conversion en minuscules
			.toLowerCase()
			// Remplacement des caractères spéciaux français
			.replace(FRENCH_LIGATURES.OE, "oe")
			.replace(FRENCH_LIGATURES.AE, "ae")
			.replace(FRENCH_LIGATURES.C_CEDILLA, "c")
			// Remplacement des espaces et caractères non-alphanumériques par des tirets
			.replace(NON_ALPHANUMERIC_PATTERN, "-")
			// Suppression des tirets multiples
			.replace(MULTIPLE_DASHES_PATTERN, "-")
			// Suppression des tirets en début et fin
			.replace(LEADING_TRAILING_DASHES_PATTERN, "")
	);
}
