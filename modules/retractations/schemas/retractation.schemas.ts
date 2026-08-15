import { z } from "zod";

/**
 * Demande publique — le token HMAC de suivi est la garde anti-énumération :
 * pas d'accès par simple orderId. Le motif est OPTIONNEL (art. L221-18 : la
 * cliente n'a pas à se justifier).
 */
export const requestRetractationSchema = z.object({
	orderId: z.cuid2({ message: "ID commande invalide" }),
	token: z.string().regex(/^[0-9a-f]{64}$/, "Lien de suivi invalide"),
	// `null` accepté : `formData.get("reason")` rend null si le champ est absent.
	reason: z
		.union([z.string().trim().max(1000, "Le motif est trop long (1000 caractères max)."), z.null()])
		.transform((value) => {
			if (!value) return null;
			return value;
		}),
});

export const markReturnReceivedSchema = z.object({
	retractationId: z.cuid2({ message: "ID demande invalide" }),
});

export const refundRetractationSchema = z.object({
	retractationId: z.cuid2({ message: "ID demande invalide" }),
	/**
	 * Restock OPT-IN, décoché par défaut : un bijou retourné n'est pas
	 * forcément revendable. `""` et `null` = décoché (le hidden input de
	 * ConfirmDialog rend `null` en `value=""`).
	 */
	restock: z
		.union([z.literal("on"), z.literal("true"), z.literal(""), z.null()])
		.transform((value) => value === "on" || value === "true"),
});

export const rejectRetractationSchema = z.object({
	retractationId: z.cuid2({ message: "ID demande invalide" }),
	/** Motif REQUIS côté admin — il part dans l'email d'information. */
	adminReason: z
		.string()
		.trim()
		.min(10, "Explique le motif du rejet (10 caractères minimum).")
		.max(1000, "Le motif est trop long (1000 caractères max)."),
});
