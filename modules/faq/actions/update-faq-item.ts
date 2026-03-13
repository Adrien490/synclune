"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_FAQ_LIMITS } from "@/shared/lib/rate-limit-config";
import { sanitizeText } from "@/shared/lib/sanitize";
import type { ActionState } from "@/shared/types/server-action";

import { getFaqInvalidationTags } from "../constants/cache";
import { updateFaqItemSchema } from "../schemas/faq.schemas";
import { validateFaqLinksConsistency } from "../services/faq-link-validator.service";
import type { FaqLink } from "../types/faq.types";

export async function updateFaqItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.UPDATE);
		if ("error" in rateLimit) return rateLimit.error;

		const rawLinks = formData.get("links") as string | null;
		let parsedLinks: FaqLink[] | null = null;
		if (rawLinks) {
			try {
				parsedLinks = JSON.parse(rawLinks) as FaqLink[];
			} catch {
				parsedLinks = null;
			}
		}

		const validated = validateInput(updateFaqItemSchema, {
			id: formData.get("id"),
			question: formData.get("question"),
			answer: formData.get("answer"),
			links: parsedLinks,
			isActive: formData.get("isActive") !== "false",
		});
		if ("error" in validated) return validated.error;

		const data = validated.data;

		const linkError = validateFaqLinksConsistency(data.answer, data.links);
		if (linkError) {
			return error(linkError);
		}

		const existing = await prisma.faqItem.findUnique({
			where: { id: data.id },
		});

		if (!existing) {
			return error("Cette question FAQ n'existe pas");
		}

		await prisma.faqItem.update({
			where: { id: data.id },
			data: {
				question: sanitizeText(data.question),
				answer: sanitizeText(data.answer),
				links: data.links ?? undefined,
				isActive: data.isActive,
			},
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.update",
			targetType: "faq",
			targetId: data.id,
			metadata: { question: data.question },
		});

		return success("Question FAQ modifiée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la modification de la question FAQ");
	}
}
