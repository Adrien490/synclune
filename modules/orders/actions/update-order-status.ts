"use server";

import { OrderStatus, PaymentStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	error,
	notFound,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { updateOrderStatusSchema, type OrderTransitionKey } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import {
	canMarkAsProcessing,
	canMarkAsDelivered,
	canMarkAsReturned,
	canRevertToProcessing,
	canUndoReturn,
} from "../services/order-status-validation.service";

/**
 * Transitions de statut NON MONÉTAIRES d'une commande, en une seule action.
 *
 * Elle remplace `mark-as-processing`, `mark-as-delivered`, `mark-as-returned`,
 * `revert-to-processing` et `undo-return` — cinq fichiers d'environ 130 lignes
 * dont le squelette était identique au commentaire près : auth → rate limit →
 * validation Zod → transaction (findUnique, garde métier, `updateMany`
 * conditionnel, audit) → mapping d'erreur → invalidation de cache.
 *
 * ⚠️ TROIS ACTIONS RESTENT DÉLIBÉRÉMENT DEHORS, et ce n'est pas un oubli :
 * `mark-as-paid`, `mark-as-fully-refunded` et `cancel-order` touchent à l'ARGENT
 * (`paymentStatus`, création d'un `Refund`, émission d'un avoir). Les fondre ici
 * ferait entrer un chemin monétaire dans une action au nom anodin, exactement ce
 * que l'allowlist de fichiers de `no-manual-paid-order.regression.test.ts` sert à
 * empêcher (invariant 8, risque « logiciel de caisse » NF 525).
 *
 * ⚠️ COROLLAIRE VERROUILLÉ : aucune entrée de `ORDER_TRANSITIONS` ne doit écrire
 * `paymentStatus`. C'est la condition qui rend cette fusion sûre, et elle est
 * assertée par `update-order-status-never-writes-payment.regression.test.ts` —
 * pas laissée à la relecture.
 *
 * La cible est nommée par une CLÉ DE TRANSITION, pas par un statut : `processing`
 * et `revert-to-processing` visent tous deux `PROCESSING`, mais depuis des états
 * différents et avec des effets différents (le second efface le suivi).
 */

/** Effets d'écriture d'une transition — `status` + colonnes de suivi, jamais l'argent. */
type TransitionData = {
	status: OrderStatus;
	deliveredAt?: Date;
	trackingNumber?: null;
	trackingUrl?: null;
	shippingCarrier?: null;
	shippedAt?: null;
};

interface TransitionConfig {
	/** Statut(s) ré-assertés dans le `where` de l'`updateMany` (garde atomique). */
	guard: { status: OrderStatus; paymentStatus?: PaymentStatus[] };
	/** Écritures appliquées. ⚠️ Jamais `paymentStatus` — cf. la note ci-dessus. */
	data: (now: Date) => TransitionData;
	/** Garde métier lue AVANT l'update, sur le snapshot `findUnique`. */
	validate: (order: {
		status: OrderStatus;
		paymentStatus: PaymentStatus;
	}) => { ok: true } | { ok: false; reason: string };
	action: "PROCESSING" | "DELIVERED" | "RETURNED" | "STATUS_REVERTED";
	/** `required` : raison obligatoire (audit) · `optional` · `none`. */
	reason: "required" | "optional" | "none";
	/** Note d'audit fixe, quand la transition n'accepte pas de raison saisie. */
	fixedNote?: string;
	metadata?: (now: Date) => Record<string, unknown>;
	errors: Record<string, string>;
	successMessage: (orderNumber: string) => string;
	failureMessage: string;
}

const ORDER_TRANSITIONS: Record<OrderTransitionKey, TransitionConfig> = {
	processing: {
		guard: {
			status: OrderStatus.PENDING,
			paymentStatus: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED],
		},
		data: () => ({ status: OrderStatus.PROCESSING }),
		validate: (o) => {
			const v = canMarkAsProcessing(o);
			return v.canProcess ? { ok: true } : { ok: false, reason: v.reason };
		},
		action: "PROCESSING",
		reason: "none",
		errors: {
			already_processing: ORDER_ERROR_MESSAGES.ALREADY_PROCESSING,
			not_pending: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_NOT_PENDING,
			cancelled: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_CANCELLED,
			unpaid: ORDER_ERROR_MESSAGES.CANNOT_PROCESS_UNPAID,
		},
		successMessage: (n) => `Commande ${n} passée en préparation.`,
		failureMessage: ORDER_ERROR_MESSAGES.MARK_AS_PROCESSING_FAILED,
	},

	delivered: {
		guard: { status: OrderStatus.SHIPPED },
		data: (now) => ({ status: OrderStatus.DELIVERED, deliveredAt: now }),
		validate: (o) => {
			const v = canMarkAsDelivered(o);
			return v.canDeliver ? { ok: true } : { ok: false, reason: v.reason };
		},
		action: "DELIVERED",
		reason: "none",
		metadata: (now) => ({ deliveryDate: now.toISOString() }),
		errors: {
			already_delivered: ORDER_ERROR_MESSAGES.ALREADY_DELIVERED,
			not_shipped: ORDER_ERROR_MESSAGES.CANNOT_DELIVER_NOT_SHIPPED,
		},
		successMessage: (n) => `Commande ${n} marquée comme livrée.`,
		failureMessage: ORDER_ERROR_MESSAGES.MARK_AS_DELIVERED_FAILED,
	},

	returned: {
		guard: { status: OrderStatus.DELIVERED },
		data: () => ({ status: OrderStatus.RETURNED }),
		validate: (o) => {
			const v = canMarkAsReturned(o);
			return v.canReturn ? { ok: true } : { ok: false, reason: v.reason };
		},
		action: "RETURNED",
		reason: "optional",
		// ORD-BIZ-010 : `requiresRefund` identifie les retours en attente de
		// remboursement ; le restock reste un geste manuel (Lot 2 SIMPLIFICATION).
		metadata: () => ({ requiresRefund: true, restockAutomated: false }),
		errors: {
			already_returned: ORDER_ERROR_MESSAGES.ALREADY_RETURNED,
			not_delivered: ORDER_ERROR_MESSAGES.CANNOT_RETURN_NOT_DELIVERED,
		},
		successMessage: (n) => `Commande ${n} marquée comme retournée.`,
		failureMessage: ORDER_ERROR_MESSAGES.MARK_AS_RETURNED_FAILED,
	},

	"revert-to-processing": {
		guard: { status: OrderStatus.SHIPPED },
		// Le suivi est effacé : une commande revenue en préparation ne doit pas
		// garder un numéro de colis qui ne correspond plus à rien.
		data: () => ({
			status: OrderStatus.PROCESSING,
			trackingNumber: null,
			trackingUrl: null,
			shippingCarrier: null,
			shippedAt: null,
		}),
		validate: (o) => {
			const v = canRevertToProcessing(o);
			return v.canRevert ? { ok: true } : { ok: false, reason: v.reason };
		},
		action: "STATUS_REVERTED",
		reason: "required",
		errors: { not_shipped: ORDER_ERROR_MESSAGES.CANNOT_REVERT_NOT_SHIPPED },
		successMessage: (n) => `Expédition annulée — la commande ${n} est de nouveau en préparation.`,
		failureMessage: ORDER_ERROR_MESSAGES.REVERT_TO_PROCESSING_FAILED,
	},

	"undo-return": {
		guard: { status: OrderStatus.RETURNED },
		data: () => ({ status: OrderStatus.DELIVERED }),
		validate: (o) => {
			const v = canUndoReturn(o);
			return v.canUndo ? { ok: true } : { ok: false, reason: v.reason };
		},
		action: "STATUS_REVERTED",
		reason: "none",
		fixedNote: "Retour annulé (saisie par erreur)",
		errors: { not_returned: ORDER_ERROR_MESSAGES.CANNOT_UNDO_NOT_RETURNED },
		successMessage: (n) => `Retour annulé — la commande ${n} est de nouveau marquée comme livrée.`,
		failureMessage: ORDER_ERROR_MESSAGES.UNDO_RETURN_FAILED,
	},
};

export async function updateOrderStatus(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// `transition` est une entrée CLIENT au même titre que `id` : un fichier
	// `"use server"` publie un endpoint RPC appelable hors UI, et le type
	// TypeScript est effacé à l'exécution. Le Zod enum ci-dessous est donc la
	// seule chose qui empêche une clé arbitraire d'atteindre la table.
	let config: TransitionConfig | undefined;
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(updateOrderStatusSchema, {
			id: safeFormGet(formData, "id"),
			transition: safeFormGet(formData, "transition"),
			// `??` et non `||` : `safeFormGet` rend `null` quand le champ est absent,
			// et une chaîne VIDE est une saisie — c'est la garde `reason: "required"`
			// qui la refuse, avec son propre message.
			reason: safeFormGet(formData, "reason") ?? undefined,
		});
		if ("error" in validated) return validated.error;

		const { id, transition, reason } = validated.data;
		config = ORDER_TRANSITIONS[transition];

		if (config.reason === "required" && !reason?.trim()) {
			return error("La raison est obligatoire.");
		}

		const now = new Date();

		// Transaction : lecture + garde + écriture + audit, atomiques (anti-TOCTOU).
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: { id: true, orderNumber: true, status: true, paymentStatus: true },
			});
			if (!found) return null;

			const validation = config!.validate(found);
			if (!validation.ok) return { ...found, _error: validation.reason };

			// Garde atomique : le `where` ré-asserte l'état attendu — miroir de
			// `validate`. `count === 0` ⇒ un writer concurrent (autre admin, webhook,
			// cron) a changé l'état entre le `findUnique` et l'`update` : on abandonne
			// SANS audit. Le `findUnique` ne verrouille pas la ligne en read-committed,
			// la transaction seule ne suffit donc pas.
			const updated = await tx.order.updateMany({
				where: {
					id,
					...notDeleted,
					status: config!.guard.status,
					...(config!.guard.paymentStatus && {
						paymentStatus: { in: config!.guard.paymentStatus },
					}),
				},
				data: config!.data(now),
			});
			if (updated.count === 0) return { ...found, _error: "concurrent_change" };

			await createOrderAuditTx(tx, {
				orderId: id,
				action: config!.action,
				previousStatus: found.status,
				newStatus: config!.data(now).status,
				note: config!.fixedNote ?? (config!.reason === "none" ? undefined : reason),
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				...(config!.metadata && { metadata: config!.metadata(now) }),
			});

			return found;
		});

		if (!order) return notFound("Commande", "f");

		if ("_error" in order) {
			return error(
				order._error === "concurrent_change"
					? ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE
					: (config.errors[order._error] ?? ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE),
			);
		}

		getOrderInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return success(config.successMessage(order.orderNumber));
	} catch (e) {
		return handleActionError(e, config?.failureMessage ?? ORDER_ERROR_MESSAGES.UPDATE_FAILED);
	}
}
