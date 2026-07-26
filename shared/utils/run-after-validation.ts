import { logger } from "@/shared/lib/logger";
import { toast } from "@/shared/utils/toast";

/**
 * Enchaîne un traitement après la validation TanStack Form, avec un `catch`.
 *
 * Les formulaires admin déclenchent `form.handleSubmit()` depuis `onSubmit` puis
 * lisent `form.state.isValid` pour décider entre dispatch de l'action serveur et
 * focus du premier champ invalide. Un `.then()` nu dans un handler JSX transforme
 * le moindre rejet (validateur qui throw, schéma Zod cassé) en unhandled
 * rejection qu'AUCUNE error boundary React n'attrape : l'utilisateur voit un
 * formulaire figé sans message. Ce wrapper garantit la trace + un retour visible.
 *
 * @param validation - la promesse renvoyée par `form.handleSubmit()`
 * @param onValidated - suite du traitement, exécutée une fois la validation finie
 * @param context - nom du formulaire, pour identifier la trace côté logs
 */
export function runAfterValidation(
	validation: Promise<void>,
	onValidated: () => void,
	context: string,
): void {
	void validation.then(onValidated).catch((error: unknown) => {
		logger.error(`[${context}] Échec inattendu de la validation du formulaire`, error);
		toast.error("Une erreur inattendue est survenue. Merci de réessayer.");
	});
}
