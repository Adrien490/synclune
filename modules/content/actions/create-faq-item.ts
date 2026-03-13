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
import { createFaqItemSchema } from "../schemas/content.schemas";
import { validateFaqLinksConsistency } from "../services/faq-link-validator.service";
import type { FaqLink } from "../types/content.types";

export async function createFaqItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.CREATE);
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

		const validated = validateInput(createFaqItemSchema, {
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

		// Get the next position
		const maxPosition = await prisma.faqItem.aggregate({
			_max: { position: true },
		});
		const nextPosition = (maxPosition._max.position ?? -1) + 1;

		await prisma.faqItem.create({
			data: {
				question: sanitizeText(data.question),
				answer: sanitizeText(data.answer),
				links: data.links ?? undefined,
				position: nextPosition,
				isActive: data.isActive,
			},
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.create",
			targetType: "faq",
			targetId: "new",
			metadata: { question: data.question },
		});

		return success("Question FAQ créée avec succès");
	} catch (e) {
		return handleActionError(e, "Erreur lors de la création de la question FAQ");
	}
}
