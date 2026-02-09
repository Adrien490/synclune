import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { DISCOUNT_CACHE_TAGS } from "@/modules/discounts/constants/cache";

/**
 * Service d'activation/désactivation des promotions programmées
 *
 * Active les promotions dont startsAt est passé et endsAt n'est pas dépassé.
 * Désactive les promotions dont endsAt est dépassé.
 */
export async function processScheduledDiscounts(): Promise<{
	activated: number;
	deactivated: number;
}> {
	console.log(
		"[CRON:process-scheduled-discounts] Starting scheduled discounts processing..."
	);

	const now = new Date();

	// 1. Activer les promotions dont la période a commencé
	const activated = await prisma.discount.updateMany({
		where: {
			isActive: false,
			startsAt: { lte: now },
			OR: [{ endsAt: null }, { endsAt: { gte: now } }],
		},
		data: {
			isActive: true,
		},
	});

	if (activated.count > 0) {
		console.log(
			`[CRON:process-scheduled-discounts] Activated ${activated.count} discounts`
		);
	}

	// 2. Désactiver les promotions expirées
	const deactivated = await prisma.discount.updateMany({
		where: {
			isActive: true,
			endsAt: { lt: now },
		},
		data: {
			isActive: false,
		},
	});

	if (deactivated.count > 0) {
		console.log(
			`[CRON:process-scheduled-discounts] Deactivated ${deactivated.count} discounts`
		);
	}

	// Invalider le cache des promotions si changements
	if (activated.count > 0 || deactivated.count > 0) {
		updateTag(DISCOUNT_CACHE_TAGS.LIST);
	}

	console.log(
		`[CRON:process-scheduled-discounts] Completed: ${activated.count} activated, ${deactivated.count} deactivated`
	);

	return {
		activated: activated.count,
		deactivated: deactivated.count,
	};
}
