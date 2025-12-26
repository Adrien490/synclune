import { z } from "zod";
import { cursorSchema } from "@/shared/constants/pagination";
import { createPerPageSchema } from "@/shared/utils/pagination";

// ============================================================================
// SUBSCRIBE TO STOCK NOTIFICATION SCHEMA
// ============================================================================

/**
 * Schema pour s'inscrire aux notifications de retour en stock
 */
export const subscribeToStockNotificationSchema = z.object({
	/** ID du SKU concerné */
	skuId: z.cuid("Identifiant de produit invalide"),

	/** Email du demandeur */
	email: z
		.string()
		.trim()
		.min(1, "L'email est requis")
		.email("Vérifie le format de ton email (ex: nom@domaine.com)")
		.max(255, "L'email ne peut pas dépasser 255 caractères")
		.toLowerCase(),

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
	token: z.cuid("Token de désinscription invalide"),
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
	skuId: z.cuid("Identifiant de SKU invalide"),

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
	cursor: cursorSchema,
	perPage: createPerPageSchema(50, 100),
});

export type GetPendingNotificationsInput = z.infer<
	typeof getPendingNotificationsSchema
>;

// ============================================================================
// BULK ADMIN SCHEMAS
// ============================================================================

/**
 * Schema pour annuler plusieurs notifications en masse (admin)
 */
export const bulkCancelStockNotificationsSchema = z.object({
	ids: z.array(z.cuid()).min(1, "Au moins une notification doit être sélectionnée"),
});

export type BulkCancelStockNotificationsInput = z.infer<
	typeof bulkCancelStockNotificationsSchema
>;

/**
 * Schema pour supprimer définitivement plusieurs notifications (RGPD)
 */
export const bulkDeleteStockNotificationsSchema = z.object({
	ids: z.array(z.cuid()).min(1, "Au moins une notification doit être sélectionnée"),
});

export type BulkDeleteStockNotificationsInput = z.infer<
	typeof bulkDeleteStockNotificationsSchema
>;
