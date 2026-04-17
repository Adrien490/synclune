"use server";

import { prisma } from "@/shared/lib/prisma";
import { exportDiscountUsagesSchema } from "../../schemas/discount.schemas";
import { DISCOUNT_ERROR_MESSAGES } from "../../constants/discount.constants";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	handleActionError,
	success,
	notFound,
	error,
	safeFormGet,
} from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_DISCOUNT_LIMITS } from "@/shared/lib/rate-limit-config";

const CSV_HEADER = [
	"Date",
	"Code",
	"Numéro de commande",
	"Total commande (€)",
	"Réduction appliquée (€)",
	"Client (nom)",
	"Client (email)",
] as const;

function escapeCsvField(value: string | number | null | undefined): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function formatCents(amount: number): string {
	return (amount / 100).toFixed(2).replace(".", ",");
}

function formatDate(date: Date): string {
	return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Server Action ADMIN pour exporter au format CSV les utilisations d'un code promo.
 *
 * Format CSV avec BOM UTF-8 pour ouverture correcte dans Excel/LibreOffice.
 * Séparateur : virgule. Décimales : virgule (locale FR).
 *
 * Le CSV est retourné via `data` ; le composant client doit créer un Blob
 * et déclencher le téléchargement (évite stockage S3 pour ce volume modeste).
 */
export async function exportDiscountUsages(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_DISCOUNT_LIMITS.EXPORT_USAGES);
		if ("error" in rateLimit) return rateLimit.error;

		const validated = validateInput(exportDiscountUsagesSchema, {
			id: safeFormGet(formData, "id"),
		});
		if ("error" in validated) return validated.error;

		const { id } = validated.data;

		const discount = await prisma.discount.findUnique({
			where: { id },
			select: { id: true, code: true },
		});

		if (!discount) {
			return notFound("Code promo");
		}

		const usages = await prisma.discountUsage.findMany({
			where: { discountId: id },
			select: {
				createdAt: true,
				discountCode: true,
				amountApplied: true,
				order: { select: { orderNumber: true, total: true } },
				user: { select: { name: true, email: true } },
			},
			orderBy: { createdAt: "desc" },
		});

		if (usages.length === 0) {
			return error(DISCOUNT_ERROR_MESSAGES.NO_USAGES_TO_EXPORT);
		}

		const rows = usages.map((u) =>
			[
				formatDate(u.createdAt),
				u.discountCode,
				u.order.orderNumber,
				formatCents(u.order.total),
				formatCents(u.amountApplied),
				u.user?.name ?? "",
				u.user?.email ?? "",
			]
				.map(escapeCsvField)
				.join(","),
		);

		const csv = "\ufeff" + [CSV_HEADER.join(","), ...rows].join("\n");
		const filename = `discount-${discount.code}-usages-${new Date().toISOString().slice(0, 10)}.csv`;

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "discount.exportUsages",
			targetType: "discount",
			targetId: id,
			metadata: { code: discount.code, count: usages.length },
		});

		return success(`Export prêt (${usages.length} utilisations)`, { csv, filename });
	} catch (e) {
		return handleActionError(e, DISCOUNT_ERROR_MESSAGES.EXPORT_USAGES_FAILED);
	}
}
