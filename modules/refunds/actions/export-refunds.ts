"use server";

import type { Prisma } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { REFUND_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { handleActionError, success, validateInput, safeFormGet } from "@/shared/lib/actions";
import { logAudit } from "@/shared/lib/audit-log";

import { exportRefundsSchema, type ExportRefundsInput } from "../schemas/refund.schemas";
import {
	buildRefundExport,
	getPeriodStartDate,
	type RefundExportRow,
} from "../services/refund-export-builder.service";

const EXPORT_MAX_ROWS = 10000;

/**
 * Exporte les remboursements au format CSV ou JSON pour la comptabilité.
 * Réservé aux administrateurs.
 *
 * Conformité Art. L123-22 Code de Commerce (conservation 10 ans).
 */
export async function exportRefunds(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(REFUND_LIMITS.EXPORT);
		if ("error" in rateLimit) return rateLimit.error;

		const validation = validateInput<ExportRefundsInput>(exportRefundsSchema, {
			period: safeFormGet(formData, "period"),
			format: safeFormGet(formData, "format"),
			status: safeFormGet(formData, "status") ?? undefined,
			reason: safeFormGet(formData, "reason") ?? undefined,
		});
		if ("error" in validation) return validation.error;

		const { period, format, status, reason } = validation.data;

		const where: Prisma.RefundWhereInput = { ...notDeleted };
		const startDate = getPeriodStartDate(period);
		if (startDate) {
			where.createdAt = { gte: startDate };
		}
		if (status) {
			where.status = status;
		}
		if (reason) {
			where.reason = reason;
		}

		const refunds = await prisma.refund.findMany({
			where,
			select: {
				id: true,
				amount: true,
				currency: true,
				status: true,
				reason: true,
				stripeRefundId: true,
				note: true,
				failureReason: true,
				createdAt: true,
				processedAt: true,
				order: {
					select: {
						orderNumber: true,
						customerEmail: true,
						customerName: true,
					},
				},
				_count: { select: { items: true } },
			},
			orderBy: { createdAt: "desc" },
			take: EXPORT_MAX_ROWS,
		});

		const rows: RefundExportRow[] = refunds.map((r) => ({
			id: r.id,
			orderNumber: r.order.orderNumber,
			customerEmail: r.order.customerEmail,
			customerName: r.order.customerName,
			amount: r.amount,
			currency: r.currency,
			status: r.status,
			reason: r.reason,
			stripeRefundId: r.stripeRefundId,
			note: r.note,
			failureReason: r.failureReason,
			createdAt: r.createdAt,
			processedAt: r.processedAt,
			itemCount: r._count.items,
		}));

		const payload = buildRefundExport(period, format, rows);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "refund.export",
			targetType: "refund",
			targetId: "bulk",
			metadata: {
				period,
				format,
				status: status ?? null,
				reason: reason ?? null,
				rowCount: rows.length,
			},
		});

		return success(`Export de ${rows.length} remboursement(s) généré.`, payload);
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'export des remboursements.");
	}
}
