import { z } from "zod"

/**
 * Schema standard pour les identifiants CUID2
 * Utilise partout ou un ID de ressource est requis
 */
export const cuidSchema = z.cuid2("ID invalide")

/**
 * Schema pour un ID utilisateur
 * Accepte une string non vide, avec trim
 */
export const userIdSchema = z.string().trim().min(1, "ID utilisateur requis")

/**
 * Version optionnelle du schema userId
 */
export const optionalUserIdSchema = userIdSchema.optional()

export type Cuid = z.infer<typeof cuidSchema>
export type UserId = z.infer<typeof userIdSchema>
