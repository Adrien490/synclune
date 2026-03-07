"use server";

import { z } from "zod";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import type { ActionState } from "@/shared/types/server-action";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";
import { updateTag } from "next/cache";
import { getDiscountInvalidationTags } from "../../constants/cache";

const duplicateDiscountSchema = z.object({
	discountId: z.cuid2("ID invalide"),
});

/**
 * Server Action ADMIN pour dupliquer un code promo
 *
 * Crée une copie du code promo avec:
 * - Un nouveau code (original + -COPY ou -COPY-N)
 * - usageCount remis à 0
 * - isActive à false (pour éviter activation accidentelle)
 */
export async function duplicateDiscount(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(duplicateDiscountSchema, {
			discountId: safeFormGet(formData, "discountId"),
		});
		if ("error" in validated) return validated.error;

		const { discountId } = validated.data;

		const original = await prisma.discount.findUnique({
			where: { id: discountId, ...notDeleted },
			select: {
				code: true,
				type: true,
				value: true,
				minOrderAmount: true,
				maxUsageCount: true,
				maxUsagePerUser: true,
				startsAt: true,
				endsAt: true,
			},
		});

		if (!original) {
			return notFound("Code promo");
		}

		// Find existing copies in a single query to determine the next suffix
		const baseCode = original.code;
		const existingCopies = await prisma.discount.findMany({
			where: {
				code: { startsWith: `${baseCode}-COPY` },
				...notDeleted,
			},
			select: { code: true },
		});

		const existingCodes = new Set(existingCopies.map((d) => d.code));
		let newCode = `${baseCode}-COPY`;

		if (existingCodes.has(newCode)) {
			let suffix = 2;
			while (existingCodes.has(`${baseCode}-COPY-${suffix}`)) {
				suffix++;
				if (suffix > 100) {
					return error("Impossible de generer un code unique. Supprimez certaines copies.");
				}
			}
			newCode = `${baseCode}-COPY-${suffix}`;
		}

		const sanitizedCode = sanitizeText(newCode);

		// Validate generated code against schema constraints (e.g. 30 chars max from DB VarChar)
		if (sanitizedCode.length > 30) {
			return error(
				"Le code genere est trop long. Raccourcissez le code original avant de dupliquer.",
			);
		}

		const duplicate = await prisma.discount.create({
			data: {
				code: sanitizedCode,
				type: original.type,
				value: original.value,
				minOrderAmount: original.minOrderAmount,
				maxUsageCount: original.maxUsageCount,
				maxUsagePerUser: original.maxUsagePerUser,
				startsAt: original.startsAt,
				endsAt: original.endsAt,
				usageCount: 0,
				isActive: false,
			},
			select: { id: true, code: true },
		});

		getDiscountInvalidationTags(duplicate.code).forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.duplicate",
			targetType: "discount",
			targetId: duplicate.id,
			metadata: { code: duplicate.code, originalDiscountId: discountId },
		});

		return success(`Code promo duplique: ${duplicate.code}`, {
			id: duplicate.id,
			code: duplicate.code,
		});
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de la duplication");
	}
}
