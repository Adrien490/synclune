import { z } from "zod";

/**
 * F4 (audit validation Zod 2026-07-06) — schémas partagés des params des
 * route handlers commande (`app/api/orders/[orderNumber]/**`).
 *
 * Harmonise le durcissement de `status/route.ts` (borne longueur orderNumber,
 * orderId cuid2) sur les routes facture/avoir : les params dynamiques et le
 * `?token` sont bornés/formatés AVANT session, rate-limit et lookup Prisma.
 * Un échec de validation → 400 (les valeurs légitimes passent toujours :
 * orderNumber court, refundId cuid, token HMAC 32 hex).
 */

export const orderNumberParamSchema = z.string().min(1).max(64);

export const refundIdParamSchema = z.cuid2();

/**
 * Token d'accès facture guest : HMAC-SHA256 tronqué à 32 chars hex
 * (`modules/orders/utils/invoice-token.ts`, TOKEN_LENGTH_HEX = 32).
 * `verifyInvoiceAccessToken` re-vérifie la longueur + timingSafeEqual —
 * ce schéma coupe seulement les payloads aberrants avant le handler.
 */
export const invoiceTokenSchema = z
	.string()
	.regex(/^[0-9a-f]{32}$/, "Token invalide")
	.nullable();
