import { OrderStatus, type RetractationStatus } from "@/app/generated/prisma/enums";

/** Fenêtre de rétractation de 14 jours (directive 2011/83/UE, art. L221-18). */
export const WITHDRAWAL_PERIOD_DAYS = 14;
const MS_PER_DAY = 86_400_000;
const WITHDRAWAL_PERIOD_MS = WITHDRAWAL_PERIOD_DAYS * MS_PER_DAY;

interface RetractationEligibilityOrder {
	status: OrderStatus;
	/**
	 * Point de départ de la fenêtre. Le schéma lean n'a plus de `deliveredAt` :
	 * on lit `shippedAt` à défaut (sauvetage lot 2, cf. docs/MIGRATION-PROMPTS.md).
	 * Légalement la fenêtre court à la RÉCEPTION — l'expédition est un proxy
	 * conservateur (fenêtre ouverte plus tôt, jamais plus tard que le droit).
	 */
	shippedAt: Date | null;
	retractation: { status: RetractationStatus } | null;
}

/**
 * Discrimine la raison précise pour laquelle une commande n'est pas éligible
 * à la rétractation.
 *
 * - `null` : éligible
 * - `NOT_PAID` : commande jamais encaissée (PENDING/CANCELLED) ou déjà remboursée
 * - `NOT_SHIPPED` : pas encore expédiée (la fenêtre n'a pas commencé)
 * - `DEADLINE_EXCEEDED` : expédiée mais fenêtre de 14 jours écoulée
 * - `ALREADY_REQUESTED` : une demande de rétractation existe déjà, quel que
 *   soit son état — REJECTED comprise
 */
export type RetractationIneligibilityReason =
	"NOT_PAID" | "NOT_SHIPPED" | "DEADLINE_EXCEEDED" | "ALREADY_REQUESTED";

export function getRetractationIneligibilityReason(
	order: RetractationEligibilityOrder,
	now: number = Date.now(),
): RetractationIneligibilityReason | null {
	// Seule une commande encaissée ouvre un droit de rétractation. REFUNDED est
	// classée ici : il n'y a plus rien à rembourser.
	const validStatus = order.status === OrderStatus.PAID || order.status === OrderStatus.SHIPPED;
	if (!validStatus) return "NOT_PAID";

	// Toute demande existante bloque, REJECTED comprise : le schéma est
	// `@unique(orderId)` (une re-demande serait un P2002) et la page de suivi
	// affiche l'état de la demande dès qu'elle existe. Ce service disait
	// l'inverse pour REJECTED (audit 2026-08-16) — trois couches, un seul
	// invariant : une seule demande par commande, l'échange continue par email.
	if (order.retractation) return "ALREADY_REQUESTED";

	if (order.status !== OrderStatus.SHIPPED || !order.shippedAt) {
		return "NOT_SHIPPED";
	}

	const deadline = new Date(order.shippedAt).getTime() + WITHDRAWAL_PERIOD_MS;
	if (now >= deadline) return "DEADLINE_EXCEEDED";

	return null;
}

/**
 * Nombre de jours restants pour demander une rétractation.
 * 0 si pas de date d'expédition ou si la fenêtre est écoulée.
 */
export function getRetractationDaysRemaining(shippedAt: Date | null): number {
	if (!shippedAt) return 0;

	const elapsed = Date.now() - new Date(shippedAt).getTime();
	const remaining = WITHDRAWAL_PERIOD_DAYS - Math.floor(elapsed / MS_PER_DAY);

	return Math.max(0, remaining);
}
