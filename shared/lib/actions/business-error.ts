/**
 * BusinessError isolée dans son propre fichier (sans aucun import).
 *
 * Pourquoi ? Sentry edge config et instrumentation-client doivent vérifier
 * `error instanceof BusinessError` mais ne peuvent pas importer Prisma
 * (incompatible Edge Runtime / Browser bundle). Ce fichier garantit qu'aucune
 * dépendance lourde ne fuit dans les bundles Edge/client.
 *
 * Utiliser cette classe pour les erreurs dont le message peut être affiché
 * directement à l'utilisateur (ex: stock insuffisant, produit indisponible,
 * code promo invalide). Les erreurs techniques (Prisma, Stripe, etc.) ne
 * doivent PAS utiliser cette classe pour éviter l'exposition de détails sensibles.
 *
 * @example
 * ```ts
 * throw new BusinessError("Stock insuffisant pour ce produit");
 * ```
 */
export class BusinessError extends Error {
	readonly code?: string;

	constructor(message: string, code?: string) {
		super(message);
		this.name = "BusinessError";
		this.code = code;
	}
}
