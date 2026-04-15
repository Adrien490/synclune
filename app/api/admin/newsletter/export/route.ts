import { requireAdminApiRoute } from "@/modules/auth/lib/require-auth";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

export async function GET() {
	const admin = await requireAdminApiRoute();
	if ("response" in admin) return admin.response;

	try {
		const subscribers = await prisma.newsletterSubscriber.findMany({
			select: {
				email: true,
				status: true,
				subscribedAt: true,
				updatedAt: true,
			},
			orderBy: { subscribedAt: "desc" },
		});

		// Build CSV
		const headers = ["Email", "Statut", "Date inscription", "Dernière mise à jour"];
		const rows = subscribers.map((sub) => [
			sub.email,
			sub.status,
			sub.subscribedAt.toISOString(),
			sub.updatedAt.toISOString(),
		]);

		const csvLines = [
			headers.join(","),
			...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
		];
		const csv = "\uFEFF" + csvLines.join("\n"); // BOM for Excel UTF-8

		const now = new Date();
		const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		const filename = `newsletter-abonnes-${dateStr}.csv`;

		return new Response(csv, {
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	} catch (error) {
		logger.error("Failed to export newsletter subscribers", error, {
			route: "admin-newsletter-export",
		});
		return new Response(JSON.stringify({ error: "Erreur lors de l'export" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
