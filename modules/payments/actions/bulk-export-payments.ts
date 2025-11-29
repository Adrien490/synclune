"use server";

import { isAdmin } from "@/modules/auth/utils/guards";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { bulkExportPaymentsSchema } from "../schemas/payment.schemas";
import { PAYMENT_STATUS_LABELS } from "@/shared/constants/order";

/**
 * Server Action ADMIN pour exporter plusieurs paiements au format CSV
 */
export async function bulkExportPayments(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		const idsRaw = formData.get("ids") as string;
		let ids: string[];

		try {
			ids = JSON.parse(idsRaw);
		} catch {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: "Format des IDs invalide",
			};
		}

		const result = bulkExportPaymentsSchema.safeParse({ ids });
		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Récupérer les paiements sélectionnés
		const payments = await prisma.order.findMany({
			where: { id: { in: result.data.ids } },
			select: {
				id: true,
				orderNumber: true,
				total: true,
				paymentStatus: true,
				paidAt: true,
				stripePaymentIntentId: true,
				createdAt: true,
				customerEmail: true,
				customerName: true,
				user: {
					select: {
						name: true,
						email: true,
					},
				},
			},
			orderBy: { paidAt: "desc" },
		});

		if (payments.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucun paiement trouvé",
			};
		}

		// Helper pour formater les prix
		const formatPrice = (priceInCents: number) => {
			return (priceInCents / 100).toFixed(2).replace(".", ",");
		};

		// Générer CSV avec BOM UTF-8 (pour Excel)
		const BOM = "\uFEFF";
		const csvHeader =
			"Numéro de commande,Client,Email,Montant (EUR),Statut,Date de paiement,Stripe Payment Intent ID,Date de création\n";

		const csvRows = payments
			.map((p) => {
				const clientName = p.user?.name || p.customerName || "Invité";
				const clientEmail = p.user?.email || p.customerEmail || "-";
				const amount = formatPrice(p.total);
				const status = PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus;
				const paidAt = p.paidAt
					? format(new Date(p.paidAt), "dd/MM/yyyy HH:mm", { locale: fr })
					: "-";
				const stripeId = p.stripePaymentIntentId || "-";
				const createdAt = format(new Date(p.createdAt), "dd/MM/yyyy HH:mm", {
					locale: fr,
				});

				// Échapper les virgules
				const escapeCsv = (str: string) =>
					str.includes(",") || str.includes('"')
						? `"${str.replace(/"/g, '""')}"`
						: str;

				return [
					p.orderNumber,
					escapeCsv(clientName),
					escapeCsv(clientEmail),
					amount,
					status,
					paidAt,
					stripeId,
					createdAt,
				].join(",");
			})
			.join("\n");

		const csv = BOM + csvHeader + csvRows;

		// Encoder en base64 pour transmission
		const csvBase64 = Buffer.from(csv, "utf-8").toString("base64");

		// Nom de fichier avec date
		const today = format(new Date(), "yyyy-MM-dd");
		const filename = `paiements-export-${today}.csv`;

		return {
			status: ActionStatus.SUCCESS,
			message: `Export réussi : ${payments.length} paiement${payments.length > 1 ? "s" : ""}`,
			data: {
				csv: csvBase64,
				filename,
				count: payments.length,
			},
		};
	} catch (error) {
		console.error("[BULK_EXPORT_PAYMENTS]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de l'export",
		};
	}
}
