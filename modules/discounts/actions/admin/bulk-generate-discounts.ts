"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/shared/lib/prisma";
import { updateTag } from "next/cache";
import { bulkGenerateDiscountsSchema } from "../../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	handleActionError,
	success,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

import { getDiscountInvalidationTags, DISCOUNT_CACHE_TAGS } from "../../constants/cache";

/**
 * Alphabet base32 sans caractères ambigus (I, O, 0, 1) pour réduire les
 * erreurs de saisie utilisateur. 32 caractères exactement.
 */
const SUFFIX_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_RETRIES = 3;

function generateSuffix(length: number): string {
	const bytes = randomBytes(length);
	let suffix = "";
	for (let i = 0; i < length; i++) {
		suffix += SUFFIX_ALPHABET[bytes[i]! % SUFFIX_ALPHABET.length];
	}
	return suffix;
}

function generateCodes(prefix: string, suffixLength: number, count: number): string[] {
	const codes = new Set<string>();
	while (codes.size < count) {
		codes.add(`${prefix}${generateSuffix(suffixLength)}`);
	}
	return Array.from(codes);
}

/**
 * Server Action ADMIN pour générer plusieurs codes promo en masse.
 *
 * Cas d'usage : campagnes marketing (ex. 500 codes "WELCOME-XXXXX" envoyés via newsletter).
 * Tous les codes générés partagent la même configuration (type, value, limites, dates)
 * mais sont uniques par leur suffixe aléatoire.
 *
 * - Suffixe en base32 sans caractères ambigus (I, O, 0, 1)
 * - createMany({ skipDuplicates: true }) + retry sur collisions
 * - isActive: true par défaut (codes prêts à être distribués)
 */
export async function bulkGenerateDiscounts(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.BULK_GENERATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			prefix: safeFormGet(formData, "prefix") ?? "",
			suffixLength: Number(formData.get("suffixLength")),
			count: Number(formData.get("count")),
			type: safeFormGet(formData, "type"),
			value: Number(formData.get("value")),
			minOrderAmount: formData.get("minOrderAmount")
				? Number(formData.get("minOrderAmount"))
				: null,
			maxUsageCount: formData.get("maxUsageCount") ? Number(formData.get("maxUsageCount")) : null,
			maxUsagePerUser: formData.get("maxUsagePerUser")
				? Number(formData.get("maxUsagePerUser"))
				: null,
			startsAt: safeFormGet(formData, "startsAt")
				? new Date(safeFormGet(formData, "startsAt")!)
				: null,
			endsAt: safeFormGet(formData, "endsAt") ? new Date(safeFormGet(formData, "endsAt")!) : null,
		};

		const validated = validateInput(bulkGenerateDiscountsSchema, rawData);
		if ("error" in validated) return validated.error;

		const data = validated.data;
		const sanitizedPrefix = sanitizeText(data.prefix);

		let inserted = 0;
		const insertedCodes: string[] = [];
		let attempts = 0;
		let remaining = data.count;

		while (remaining > 0 && attempts < MAX_RETRIES) {
			const candidates = generateCodes(sanitizedPrefix, data.suffixLength, remaining);
			const result = await prisma.discount.createMany({
				data: candidates.map((code) => ({
					code,
					type: data.type,
					value: data.value,
					minOrderAmount: data.minOrderAmount,
					maxUsageCount: data.maxUsageCount,
					maxUsagePerUser: data.maxUsagePerUser,
					startsAt: data.startsAt ?? undefined,
					endsAt: data.endsAt,
					isActive: true,
				})),
				skipDuplicates: true,
			});

			inserted += result.count;
			remaining -= result.count;
			attempts++;

			// Capture tous les codes candidats; en cas de collision le code n'est pas inséré
			// mais nous ne savons pas lesquels ont échoué (skipDuplicates ne le rapporte pas).
			// Pour le retour à l'admin, on requête les codes effectivement créés via le préfixe partagé.
			if (result.count === candidates.length) {
				insertedCodes.push(...candidates);
			}
		}

		if (inserted === 0) {
			return error(DISCOUNT_ERROR_MESSAGES.BULK_GENERATE_NO_CODES);
		}

		// Si certains lots ont eu des collisions, recharger la liste finale réelle depuis la DB
		// pour le retour utilisateur (filtrée par préfixe + créés dans la dernière minute).
		let finalCodes = insertedCodes;
		if (insertedCodes.length !== inserted) {
			const recent = await prisma.discount.findMany({
				where: {
					code: { startsWith: sanitizedPrefix },
					createdAt: { gte: new Date(Date.now() - 60_000) },
				},
				select: { code: true },
				orderBy: { createdAt: "desc" },
				take: inserted,
			});
			finalCodes = recent.map((d) => d.code);
		}

		updateTag(DISCOUNT_CACHE_TAGS.LIST);
		getDiscountInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.bulkGenerate",
			targetType: "discount",
			targetId: `batch-${Date.now()}`,
			metadata: {
				prefix: sanitizedPrefix,
				suffixLength: data.suffixLength,
				requested: data.count,
				inserted,
				type: data.type,
				value: data.value,
			},
		});

		const message =
			inserted < data.count
				? `${inserted}/${data.count} codes générés (${data.count - inserted} collisions ignorées)`
				: `${inserted} codes promo générés avec succès`;

		return success(message, { codes: finalCodes, count: inserted });
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.BULK_GENERATE_FAILED);
	}
}
