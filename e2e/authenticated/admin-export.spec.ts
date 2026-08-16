import { expect, test } from "../fixtures";
import { getE2ePrisma } from "../helpers/db";
import { testEmail } from "../helpers/test-run";

/**
 * Export du livre de recettes (art. 50-0 CGI) — `POST /api/admin/orders/export`.
 *
 * Contrat verrouillé (cf. `app/api/admin/orders/export/route.ts`) :
 * - réponse JSON `{ csvBase64, filename }` (le CSV voyage en base64) ;
 * - CSV préfixé du BOM UTF-8 (Excel FR), séparateur `;`, lignes CRLF ;
 * - en-têtes `numero_facture;date;email;total_ttc_eur;statut` ;
 * - seules les commandes ENCAISSÉES (PAID/SHIPPED/REFUNDED) sortent — une
 *   PENDING n'est pas du chiffre d'affaires ;
 * - tri global par numéro de facture croissant.
 *
 * La session admin vient du storageState du projet `authenticated-admin` :
 * `page.request` porte le cookie `admin_session`.
 */
test.describe("Admin export livre de recettes", () => {
	test.skip(!process.env.DATABASE_URL, "DATABASE_URL requis (création de commandes)");

	/** Crée une commande avec numéro de facture séquentiel réel (max+1, retry P2002). */
	async function createOrderWithInvoice(params: { emailSuffix: string; amountTotalCents: number }) {
		const prisma = getE2ePrisma();
		for (let attempt = 0; attempt < 5; attempt++) {
			const aggregate = await prisma.order.aggregate({ _max: { invoiceNumber: true } });
			const invoiceNumber = (aggregate._max.invoiceNumber ?? 0) + 1;
			try {
				return await prisma.order.create({
					data: {
						stripeSessionId: `pending_e2e_export_${Date.now()}_${Math.random().toString(36).slice(2)}`,
						status: "PAID",
						invoiceNumber,
						email: testEmail(params.emailSuffix),
						customerName: "Cliente E2E Export",
						shippingLine1: "1 rue du Test",
						shippingZip: "44000",
						shippingCity: "Nantes",
						shippingCountry: "FR",
						amountItemsCents: params.amountTotalCents - 499,
						amountShippingCents: 499,
						amountTotalCents: params.amountTotalCents,
						items: {
							create: [
								{
									nameSnapshot: "Collier e2e export",
									variantSnapshot: null,
									unitPriceCents: params.amountTotalCents - 499,
									quantity: 1,
								},
							],
						},
					},
					select: { id: true, email: true, invoiceNumber: true },
				});
			} catch (e) {
				// P2002 : un webhook concurrent (checkout-hosted) a pris le numéro —
				// même stratégie de retry que le service de transition.
				if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
					continue;
				}
				throw e;
			}
		}
		throw new Error("createOrderWithInvoice : tentatives épuisées (collisions P2002)");
	}

	test("le CSV contient les commandes encaissées, exclut les PENDING, trié par numéro", async ({
		page,
	}) => {
		const prisma = getE2ePrisma();

		const paid1 = await createOrderWithInvoice({
			emailSuffix: "export-paid-1",
			amountTotalCents: 4299,
		});
		const paid2 = await createOrderWithInvoice({
			emailSuffix: "export-paid-2",
			amountTotalCents: 12850,
		});
		const pending = await prisma.order.create({
			data: {
				stripeSessionId: `pending_e2e_export_${Date.now()}_${Math.random().toString(36).slice(2)}`,
				status: "PENDING",
				email: testEmail("export-pending"),
				amountItemsCents: 1000,
				amountShippingCents: 499,
				amountTotalCents: 1499,
			},
			select: { id: true, email: true },
		});

		try {
			const response = await page.request.post("/api/admin/orders/export");
			expect(response.status()).toBe(200);

			const body = (await response.json()) as { csvBase64: string; filename: string };
			expect(body.filename).toMatch(/^livre-recettes-synclune-\d{4}-\d{2}-\d{2}\.csv$/);

			const csv = Buffer.from(body.csvBase64, "base64").toString("utf8");

			// BOM UTF-8 en tête (sans lui, Excel FR ouvre les accents en mojibake).
			expect(csv.charCodeAt(0)).toBe(0xfeff);

			const lines = csv.slice(1).split("\r\n").filter(Boolean);
			expect(lines[0]).toBe("numero_facture;date;email;total_ttc_eur;statut");

			// Nos deux commandes PAID sont présentes, avec montant FR et statut réel.
			const line1 = lines.find((l) => l.includes(paid1.email));
			const line2 = lines.find((l) => l.includes(paid2.email));
			expect(line1).toBeTruthy();
			expect(line2).toBeTruthy();
			expect(line1).toBe(
				`${paid1.invoiceNumber};${new Date().toISOString().slice(0, 10)};"${paid1.email}";42,99;Payée — à expédier`,
			);
			expect(line2).toContain(";128,50;");

			// La PENDING est EXCLUE : elle n'est pas encaissée.
			expect(csv).not.toContain(pending.email);

			// Tri global par numéro de facture croissant (lignes numérotées).
			const invoiceNumbers = lines
				.slice(1)
				.map((l) => l.split(";")[0] ?? "")
				.filter((v) => /^\d+$/.test(v))
				.map(Number);
			expect(invoiceNumbers.length).toBeGreaterThanOrEqual(2);
			const sorted = [...invoiceNumbers].sort((a, b) => a - b);
			expect(invoiceNumbers).toEqual(sorted);
		} finally {
			await prisma.order.deleteMany({
				where: { id: { in: [paid1.id, paid2.id, pending.id] } },
			});
		}
	});
});
