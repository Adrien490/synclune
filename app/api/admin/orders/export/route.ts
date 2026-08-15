import { NextResponse } from "next/server";
import { requireAdminApiRoute } from "@/modules/admin-auth/lib/require-admin";
import { ORDER_STATUS_LABELS } from "@/modules/orders/constants/order.constants";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

/**
 * Export du livre de recettes (Art. 50-0 CGI — CA à l'encaissement).
 *
 * CSV minimal : commandes encaissées (PAID / SHIPPED / REFUNDED), triées par
 * numéro de facture. Colonnes : numéro de facture, date, email, total TTC en
 * euros, statut.
 *
 * ⚠️ Limite assumée (schéma lean) : la date Stripe d'encaissement n'est plus
 * stockée. On exporte `createdAt` — la création de la commande PENDING, que
 * le paiement suit de quelques minutes (la session Checkout expire en ~30
 * min). `updatedAt` serait pire : il bouge à l'expédition.
 */
export async function POST() {
	const auth = await requireAdminApiRoute();
	if ("response" in auth) return auth.response;

	try {
		const orders = await prisma.order.findMany({
			where: { status: { in: ["PAID", "SHIPPED", "REFUNDED"] } },
			select: {
				invoiceNumber: true,
				createdAt: true,
				email: true,
				amountTotalCents: true,
				status: true,
			},
			orderBy: [{ invoiceNumber: "asc" }],
		});

		const header = "numero_facture;date;email;total_ttc_eur;statut";
		const lines = orders.map((order) =>
			[
				order.invoiceNumber ?? "",
				order.createdAt.toISOString().slice(0, 10),
				// Échappement CSV minimal : le délimiteur est « ; », un email n'en
				// contient pas, mais on cite par prudence.
				`"${order.email.replaceAll('"', '""')}"`,
				(order.amountTotalCents / 100).toFixed(2).replace(".", ","),
				ORDER_STATUS_LABELS[order.status],
			].join(";"),
		);
		// BOM UTF-8 : sans lui, Excel FR ouvre les accents en mojibake.
		const csv = `﻿${[header, ...lines].join("\r\n")}\r\n`;

		const today = new Date().toISOString().slice(0, 10);
		return NextResponse.json({
			csvBase64: Buffer.from(csv, "utf8").toString("base64"),
			filename: `livre-recettes-synclune-${today}.csv`,
		});
	} catch (error) {
		logger.error("[orders/export] Échec de génération du CSV", { error });
		return NextResponse.json({ error: "Export impossible" }, { status: 500 });
	}
}
