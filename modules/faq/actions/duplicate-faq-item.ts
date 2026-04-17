"use server";

import { updateTag } from "next/cache";

import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { validateInput, handleActionError, success, notFound } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";
import { prisma } from "@/shared/lib/prisma";
import { ADMIN_FAQ_LIMITS } from "@/shared/lib/rate-limit-config";
import type { ActionState } from "@/shared/types/server-action";

import { getFaqInvalidationTags } from "../constants/cache";
import { duplicateFaqItemSchema } from "../schemas/faq.schemas";

const COPY_SUFFIX = " (copie)";
const QUESTION_MAX_LENGTH = 300;

function buildDuplicatedQuestion(original: string): string {
	const candidate = `${original}${COPY_SUFFIX}`;
	if (candidate.length <= QUESTION_MAX_LENGTH) return candidate;
	const truncatedOriginal = original.slice(0, QUESTION_MAX_LENGTH - COPY_SUFFIX.length);
	return `${truncatedOriginal}${COPY_SUFFIX}`;
}

export async function duplicateFaqItem(
	_: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_FAQ_LIMITS.DUPLICATE);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(duplicateFaqItemSchema, {
			id: formData.get("id"),
		});
		if ("error" in validated) return validated.error;

		const source = await prisma.faqItem.findUnique({
			where: { id: validated.data.id },
			select: { question: true, answer: true, links: true },
		});

		if (!source) {
			return notFound("La question FAQ source");
		}

		const maxPosition = await prisma.faqItem.aggregate({
			_max: { position: true },
		});
		const nextPosition = (maxPosition._max.position ?? -1) + 1;

		const duplicated = await prisma.faqItem.create({
			data: {
				question: buildDuplicatedQuestion(source.question),
				answer: source.answer,
				links: source.links ?? undefined,
				position: nextPosition,
				isActive: false,
			},
			select: { id: true, question: true },
		});

		getFaqInvalidationTags().forEach((tag) => updateTag(tag));

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "faq.duplicate",
			targetType: "faq",
			targetId: duplicated.id,
			metadata: { sourceId: validated.data.id, question: duplicated.question },
		});

		return success("Question FAQ dupliquée avec succès", { id: duplicated.id });
	} catch (e) {
		return handleActionError(e, "Erreur lors de la duplication de la question FAQ");
	}
}
