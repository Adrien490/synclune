import { expect, test } from "../fixtures";
import { getE2ePrisma } from "../helpers/db";
import { testEmail } from "../helpers/test-run";

/**
 * Workflow admin des rétractations (lot 5) : liste, détail, « Colis reçu »,
 * « Rejeter ». Le remboursement Stripe n'est PAS joué en e2e (il exige un
 * PaymentIntent test réel) — sa transaction est couverte en unitaire
 * (`finalize-retractation-refund.service.test.ts`).
 */
test.describe("Admin rétractations", () => {
	test.skip(!process.env.DATABASE_URL, "DATABASE_URL requis (création de demandes)");

	async function createRetractation(emailSuffix: string) {
		const prisma = getE2ePrisma();
		const order = await prisma.order.create({
			data: {
				stripeSessionId: `pending_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`,
				status: "SHIPPED",
				email: testEmail(emailSuffix),
				customerName: "Cliente E2E Rétractation",
				shippingLine1: "1 rue du Test",
				shippingZip: "44000",
				shippingCity: "Nantes",
				shippingCountry: "FR",
				shippedAt: new Date(Date.now() - 2 * 86_400_000),
				amountItemsCents: 3800,
				amountShippingCents: 499,
				amountTotalCents: 4299,
				items: {
					create: [
						{
							nameSnapshot: "Collier e2e",
							variantSnapshot: null,
							unitPriceCents: 3800,
							quantity: 1,
						},
					],
				},
			},
			select: { id: true },
		});
		const retractation = await prisma.retractationRequest.create({
			data: {
				orderId: order.id,
				reason: "Test e2e",
				status: "ACKNOWLEDGED",
				acknowledgedAt: new Date(),
			},
			select: { id: true },
		});
		return { orderId: order.id, retractationId: retractation.id };
	}

	async function cleanup(orderId: string) {
		const prisma = getE2ePrisma();
		await prisma.retractationRequest.deleteMany({ where: { orderId } });
		await prisma.order.deleteMany({ where: { id: orderId } });
	}

	test("liste → détail → « Colis reçu » fait passer la demande à rembourser", async ({
		page,
		adminPage,
	}) => {
		const { orderId, retractationId } = await createRetractation("admin-received");

		try {
			await adminPage.gotoRetractations();
			await expect(page.getByRole("heading", { level: 1, name: /Rétractations/i })).toBeVisible();

			// ⚠️ Pas d'assertion sur la ligne : `getRetractations()` est un `"use cache"`
			// SANS paramètre — une demande créée via Prisma peut légitimement manquer à la
			// liste pendant la fenêtre stale (doctrine cache admin). Le détail, keyé par
			// id, est frais : le workflow se vérifie là.

			await page.goto(`/admin/ventes/retractations/${retractationId}`);
			await expect(page.getByText(/retour attendu/i).first()).toBeVisible();

			await page.getByRole("button", { name: /Colis reçu/i }).click();
			await page
				.getByRole("alertdialog")
				.getByRole("button", { name: /Colis reçu/i })
				.click();

			// Transition ACKNOWLEDGED → AWAITING_RETURN — poll la BASE (une
			// assertion UI peut matcher un libellé statique avant la mutation).
			const prisma = getE2ePrisma();
			await expect
				.poll(
					async () =>
						(
							await prisma.retractationRequest.findUnique({
								where: { id: retractationId },
								select: { status: true },
							})
						)?.status,
					{ timeout: 15_000 },
				)
				.toBe("AWAITING_RETURN");
			const after = await prisma.retractationRequest.findUnique({
				where: { id: retractationId },
				select: { itemReceivedAt: true },
			});
			expect(after?.itemReceivedAt).not.toBeNull();
		} finally {
			await cleanup(orderId);
		}
	});

	test("« Rejeter » exige un motif puis informe la cliente", async ({ page }) => {
		const { orderId, retractationId } = await createRetractation("admin-reject");

		try {
			await page.goto(`/admin/ventes/retractations/${retractationId}`);

			await page.getByRole("button", { name: /Rejeter/i }).click();
			const dialog = page.getByRole("alertdialog");
			const confirmButton = dialog.getByRole("button", { name: /Rejeter et informer/i });

			// Motif REQUIS : la confirmation est désactivée tant qu'il est vide
			// (confirmDisabled — une contrainte HTML ne serait jamais rapportée).
			await expect(confirmButton).toBeDisabled();
			await dialog
				.getByLabel(/Motif du rejet/i)
				.fill("Demande hors délai légal de quatorze jours.");
			await expect(confirmButton).toBeEnabled();
			await confirmButton.click();

			const prisma = getE2ePrisma();
			await expect
				.poll(
					async () =>
						(
							await prisma.retractationRequest.findUnique({
								where: { id: retractationId },
								select: { status: true },
							})
						)?.status,
					{ timeout: 15_000 },
				)
				.toBe("REJECTED");
		} finally {
			await cleanup(orderId);
		}
	});

	test("l'avoir n'existe pas avant remboursement, la facture admin est accessible", async ({
		page,
	}) => {
		const { orderId } = await createRetractation("admin-avoir");
		const prisma = getE2ePrisma();
		await prisma.order.update({ where: { id: orderId }, data: { invoiceNumber: 99997 } });

		try {
			// Facture HTML — accès session admin sans token (lot 4).
			await page.goto(`/suivi-commande/facture?commande=${orderId}`);
			await expect(page.getByRole("heading", { name: /Facture n° 99997/i })).toBeVisible();
			await expect(page.getByText(/TVA non applicable/i).first()).toBeVisible();

			// Pas d'avoir tant que la demande n'est pas REFUNDED : page 404 (contenu).
			await page.goto(`/suivi-commande/avoir?commande=${orderId}`);
			await expect(page.getByRole("heading", { name: /Avoir n°/i })).toHaveCount(0);
		} finally {
			await cleanup(orderId);
		}
	});
});
