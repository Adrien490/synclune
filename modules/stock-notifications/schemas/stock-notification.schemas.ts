import { z } from "zod";

// ============================================================================
// SUBSCRIBE TO STOCK NOTIFICATION SCHEMA
// ============================================================================

/**
 * Schema pour s'inscrire aux notifications de retour en stock
 */
export const subscribeToStockNotificationSchema = z.object({
	/** ID du SKU concerné */
	skuId: z.string().min(1, "L'identifiant du produit est requis"),

	/** Email du demandeur */
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Format d'email invalide")
		.max(255, "L'email ne peut pas dépasser 255 caractères"),

	/** Consentement pour recevoir la notification */
	consent: z.boolean().refine((val) => val === true, {
		message: "Vous devez accepter de recevoir la notification",
	}),
});

export type SubscribeToStockNotificationInput = z.infer<
	typeof subscribeToStockNotificationSchema
>;

// ============================================================================
// UNSUBSCRIBE FROM STOCK NOTIFICATION SCHEMA
// ============================================================================

/**
 * Schema pour se désinscrire d'une notification de retour en stock
 */
export const unsubscribeFromStockNotificationSchema = z.object({
	/** Token de désinscription unique */
	token: z.string().min(1, "Le token de désinscription est requis"),
});

export type UnsubscribeFromStockNotificationInput = z.infer<
	typeof unsubscribeFromStockNotificationSchema
>;

// ============================================================================
// NOTIFY STOCK AVAILABLE SCHEMA (ADMIN/CRON)
// ============================================================================

/**
 * Schema pour déclencher l'envoi des notifications (action admin/cron)
 */
export const notifyStockAvailableSchema = z.object({
	/** ID du SKU qui est de retour en stock */
	skuId: z.string().min(1, "L'identifiant du SKU est requis"),

	/** Quantité disponible en stock */
	availableQuantity: z.number().int().min(1, "Le stock doit être positif"),
});

export type NotifyStockAvailableInput = z.infer<
	typeof notifyStockAvailableSchema
>;

// ============================================================================
// GET PENDING NOTIFICATIONS SCHEMA
// ============================================================================

/**
 * Schema pour récupérer les demandes de notification en attente
 */
export const getPendingNotificationsSchema = z.object({
	/** ID du SKU (optionnel, pour filtrer) */
	skuId: z.string().optional(),

	/** Pagination */
	cursor: z.string().optional(),
	perPage: z.number().int().min(1).max(100).default(50),
});

export type GetPendingNotificationsInput = z.infer<
	typeof getPendingNotificationsSchema
>;
