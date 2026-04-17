"use server";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";

import { PaymentStatus } from "@/app/generated/prisma/client";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { logAudit } from "@/shared/lib/audit-log";
import {
	validateInput,
	success,
	error,
	handleActionError,
	safeFormGet,
} from "@/shared/lib/actions";
import { ADMIN_USER_LIMITS } from "@/shared/lib/rate-limit-config";
import { exportUsersListSchema } from "../../schemas/user-admin.schemas";
import {
	buildUsersListExport,
	type ExportUserRow,
} from "../../services/export-users-list-builder.service";

const MAX_EXPORT_ROWS = 10000;

/**
 * Admin CSV/JSON export of the users list with order aggregates.
 *
 * Use case: reporting, compta, CNIL requests. Strict rate limit (3 / 5 min).
 * Anonymized users keep their anonymized email in the export (no de-anonymization).
 */
export async function exportUsersList(
	_prevState: unknown,
	formData: FormData,
): Promise<ActionState> {
	try {
		const rateCheck = await enforceRateLimitForCurrentUser(ADMIN_USER_LIMITS.EXPORT_LIST);
		if ("error" in rateCheck) return rateCheck.error;

		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rawData = {
			format: safeFormGet(formData, "format"),
			role: safeFormGet(formData, "role") ?? undefined,
			accountStatus: safeFormGet(formData, "accountStatus") ?? undefined,
		};

		const validation = validateInput(exportUsersListSchema, rawData);
		if ("error" in validation) return validation.error;

		const { format, role, accountStatus } = validation.data;

		const users = await prisma.user.findMany({
			where: {
				...notDeleted,
				...(role ? { role } : {}),
				...(accountStatus ? { accountStatus } : {}),
			},
			orderBy: { createdAt: "desc" },
			take: MAX_EXPORT_ROWS,
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				accountStatus: true,
				createdAt: true,
				emailVerified: true,
				orders: {
					where: { paymentStatus: PaymentStatus.PAID },
					select: { total: true },
				},
			},
		});

		if (users.length === 0) {
			return error("Aucun utilisateur ne correspond aux filtres.");
		}

		const rows: ExportUserRow[] = users.map((u) => {
			const totalCents = u.orders.reduce((sum, o) => sum + o.total, 0);
			return {
				id: u.id,
				email: u.email,
				name: u.name,
				role: u.role,
				accountStatus: u.accountStatus,
				createdAt: u.createdAt,
				emailVerified: u.emailVerified,
				ordersCount: u.orders.length,
				totalSpent: totalCents / 100,
			};
		});

		const payload = buildUsersListExport(format, rows);

		void logAudit({
			adminId: adminUser.id,
			adminName: adminUser.name ?? adminUser.email,
			action: "user.exportList",
			targetType: "user",
			targetId: "list",
			metadata: {
				count: rows.length,
				format,
				role: role ?? null,
				accountStatus: accountStatus ?? null,
			},
		});

		return success(`Export prepare: ${rows.length} utilisateur(s).`, payload);
	} catch (e) {
		return handleActionError(e, "Erreur lors de l'export des utilisateurs");
	}
}
