"use server";

import { auth } from "@/modules/auth/lib/auth";
import { prisma } from "@/shared/lib/prisma";
import { ActionState, ActionStatus } from "@/shared/types/server-action";
import { headers } from "next/headers";
import { exportInvoicesSchema } from "../schemas/order.schemas";

/**
 * Export du livre de recettes au format CSV
 *
 * Conformite legale francaise :
 * - Article 286 du CGI : Obligation de tenir un livre de recettes
 * - Article L123-22 du Code de commerce : Conservation 10 ans
 *
 * Server Action reservee aux administrateurs
 * Retourne les donnees CSV en base64 pour telechargement cote client
 *
 * @returns ActionState avec data.csv (string base64) et data.filename
 */
export async function exportInvoices(
	_previousState: ActionState | null,
	formData: FormData
): Promise<ActionState> {
	try {
		// Verification admin
		const session = await auth.api.getSession({ headers: await headers() });

		if (!session?.user) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action",
			};
		}

		if (session.user.role !== "ADMIN") {
			return {
				status: ActionStatus.FORBIDDEN,
				message: "Vous n'avez pas les permissions pour effectuer cette action",
			};
		}

		// Validation avec Zod
		const periodType = formData.get("periodType") || "all";
		const year = formData.get("year");
		const month = formData.get("month");
		const dateFrom = formData.get("dateFrom");
		const dateTo = formData.get("dateTo");
		const format = formData.get("format") || "csv";
		const invoiceStatus = formData.get("invoiceStatus") || "all";

		const result = exportInvoicesSchema.safeParse({
			periodType,
			year: year ? Number(year) : undefined,
			month: month ? Number(month) : undefined,
			dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
			dateTo: dateTo ? new Date(dateTo as string) : undefined,
			format,
			invoiceStatus,
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		const params = result.data;

		// Construire le filtre de date selon le type de periode
		let dateFilter: { gte?: Date; lte?: Date } | undefined;

		if (params.periodType === "year" && params.year) {
			// Annee complete : 1er janvier au 31 decembre
			dateFilter = {
				gte: new Date(`${params.year}-01-01T00:00:00.000Z`),
				lte: new Date(`${params.year}-12-31T23:59:59.999Z`),
			};
		} else if (params.periodType === "month" && params.year && params.month) {
			// Mois specifique
			const lastDay = new Date(params.year, params.month, 0).getDate(); // Dernier jour du mois
			dateFilter = {
				gte: new Date(`${params.year}-${String(params.month).padStart(2, "0")}-01T00:00:00.000Z`),
				lte: new Date(`${params.year}-${String(params.month).padStart(2, "0")}-${lastDay}T23:59:59.999Z`),
			};
		} else if (
			params.periodType === "custom" &&
			params.dateFrom &&
			params.dateTo
		) {
			// Periode personnalisee
			dateFilter = {
				gte: params.dateFrom,
				lte: params.dateTo,
			};
		}

		// Construire le filtre Prisma complet
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const whereClause: any = {};

		// Filtre de date
		if (dateFilter) {
			whereClause.invoiceGeneratedAt = dateFilter;
		} else {
			// Si pas de filtre de date, au moins avoir une invoiceGeneratedAt
			whereClause.invoiceGeneratedAt = { gte: new Date("2020-01-01") };
		}

		// Filtre de statut
		// On exporte uniquement les factures finalisées (FINALIZED ou PAID)
		if (params.invoiceStatus === "sent" || params.invoiceStatus === "archived" || params.invoiceStatus === "all") {
			whereClause.invoiceStatus = { in: ["FINALIZED", "PAID"] };
		} else {
			whereClause.invoiceStatus = { in: ["FINALIZED", "PAID"] };
		}

		// Recuperer les commandes avec leurs factures
		const orders = await prisma.order.findMany({
			where: whereClause,
			select: {
				id: true,
				orderNumber: true,
				invoiceNumber: true,
				invoiceGeneratedAt: true,
				invoiceStatus: true,
				subtotal: true,
				discountAmount: true,
				taxAmount: true,
				shippingCost: true,
				total: true,
				paymentMethod: true,
				user: {
					select: {
						name: true,
						email: true,
					},
				},
			},
			orderBy: { invoiceGeneratedAt: "desc" },
		});

		if (orders.length === 0) {
			return {
				status: ActionStatus.ERROR,
				message: "Aucune facture trouvée avec les filtres sélectionnés",
			};
		}

		// Generer CSV avec BOM UTF-8 (pour Excel)
		const BOM = "\uFEFF";
		const csvHeader =
			"Date de vente,Numéro de facture,Client,Email,Montant HT (€),Réduction (€),TVA (€),Frais de port (€),Montant TTC (€),Moyen de paiement,Statut\n";

		const csvRows = orders
			.map((order) => {
				// Formatage des dates
				const invoiceDate = order.invoiceGeneratedAt
					? new Date(order.invoiceGeneratedAt).toLocaleDateString("fr-FR")
					: "N/A";

				// Conversion centimes -> euros
				const subtotalEur = (order.subtotal / 100).toFixed(2);
				const discountEur = (order.discountAmount / 100).toFixed(2);
				const taxEur = (order.taxAmount / 100).toFixed(2);
				const shippingEur = (order.shippingCost / 100).toFixed(2);
				const totalEur = (order.total / 100).toFixed(2);

				// Client (echapper les virgules et guillemets)
				const clientName = (order.user?.name || "Client inconnu")
					.replace(/"/g, '""');
				const clientEmail = (order.user?.email || "N/A")
					.replace(/"/g, '""');

				// Moyen de paiement
				const paymentMethod = order.paymentMethod || "N/A";

				// Statut
				const statusLabel =
					order.invoiceStatus === "FINALIZED" || order.invoiceStatus === "PAID"
						? "Finalisée"
						: "En attente";

				// Echapper les champs avec virgules
				const invoiceNumber = order.invoiceNumber || "N/A";

				return `${invoiceDate},"${invoiceNumber}","${clientName}","${clientEmail}",${subtotalEur},${discountEur},${taxEur},${shippingEur},${totalEur},"${paymentMethod}",${statusLabel}`;
			})
			.join("\n");

		const csv = BOM + csvHeader + csvRows;

		// Encoder en base64 pour transmission via ActionState
		const csvBase64 = Buffer.from(csv, "utf-8").toString("base64");

		// Generer nom de fichier descriptif
		const today = new Date().toISOString().split("T")[0];
		let periodSuffix = "";

		if (params.periodType === "year" && params.year) {
			periodSuffix = `-${params.year}`;
		} else if (params.periodType === "month" && params.year && params.month) {
			periodSuffix = `-${params.year}-${String(params.month).padStart(2, "0")}`;
		} else if (
			params.periodType === "custom" &&
			params.dateFrom &&
			params.dateTo
		) {
			const from = params.dateFrom.toISOString().split("T")[0];
			const to = params.dateTo.toISOString().split("T")[0];
			periodSuffix = `-${from}_${to}`;
		}

		const statusSuffix =
			params.invoiceStatus === "archived"
				? "-archivées"
				: params.invoiceStatus === "sent"
					? "-envoyées"
					: "";

		const filename = `livre-recettes-synclune${periodSuffix}${statusSuffix}-${today}.csv`;

		return {
			status: ActionStatus.SUCCESS,
			message: `Export réussi : ${orders.length} facture(s)`,
			data: {
				csv: csvBase64,
				filename,
				count: orders.length,
			},
		};
	} catch (error) {
		return {
			status: ActionStatus.ERROR,
			message: "Une erreur est survenue lors de l'export",
		};
	}
}
