import { createHmac } from "node:crypto";
import { expect, test } from "./fixtures";
import { getE2ePrisma } from "./helpers/db";
import { testEmail } from "./helpers/test-run";

/**
 * Rétractation en ligne — parcours PUBLIC (lot 5, obligation du 19 juin 2026).
 *
 * L'accès passe par le lien tokenisé HMAC du suivi de commande (seul accès
 * client). La commande de test est créée en base (email e2e — ramassée par le
 * teardown si le nettoyage in-spec échoue), le token recalculé avec le même
 * `AUTH_SECRET` que le serveur.
 *
 * Chromium uniquement : le flux écrit en base à chaque passage.
 */
test.describe("Rétractation publique @critical", () => {
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Flux à effets de bord (écritures en base) — chromium seul",
	);
	test.skip(
		!process.env.AUTH_SECRET || !process.env.DATABASE_URL,
		"AUTH_SECRET / DATABASE_URL requis (token HMAC + création de commande)",
	);

	function trackingToken(orderId: string, email: string): string {
		return createHmac("sha256", process.env.AUTH_SECRET!)
			.update(`${orderId}:${email.trim().toLowerCase()}`)
			.digest("hex");
	}

	async function createShippedOrder(email: string) {
		const prisma = getE2ePrisma();
		return prisma.order.create({
			data: {
				stripeSessionId: `pending_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`,
				status: "SHIPPED",
				invoiceNumber: null,
				email,
				customerName: "Cliente E2E",
				shippingLine1: "1 rue du Test",
				shippingZip: "44000",
				shippingCity: "Nantes",
				shippingCountry: "FR",
				// Expédiée il y a 2 jours : dans la fenêtre légale de 14 jours.
				shippedAt: new Date(Date.now() - 2 * 86_400_000),
				trackingNumber: "6A12345678901",
				amountItemsCents: 3800,
				amountShippingCents: 499,
				amountTotalCents: 4299,
				items: {
					create: [
						{
							nameSnapshot: "Collier e2e",
							variantSnapshot: "Rose bonbon",
							unitPriceCents: 3800,
							quantity: 1,
						},
					],
				},
			},
			select: { id: true },
		});
	}

	async function cleanup(orderId: string) {
		const prisma = getE2ePrisma();
		await prisma.retractationRequest.deleteMany({ where: { orderId } });
		await prisma.order.deleteMany({ where: { id: orderId } });
	}

	test("suivi → « Me rétracter » → demande enregistrée, puis affichée au rechargement", async ({
		page,
	}) => {
		const email = testEmail("retract");
		const order = await createShippedOrder(email);
		const token = trackingToken(order.id, email);

		try {
			await page.goto(`/suivi-commande?commande=${order.id}&token=${token}`);

			// Le suivi propose la rétractation dans la fenêtre des 14 jours.
			const openFormButton = page.getByRole("button", { name: /Me rétracter/i });
			await expect(openFormButton).toBeVisible();
			await openFormButton.click();

			// Motif OPTIONNEL — la cliente n'a pas à se justifier.
			await page.getByLabel(/Motif/i).fill("Trop grande pour moi");
			await page.getByRole("button", { name: /Envoyer ma demande/i }).click();

			await expect(page.getByText(/demande de rétractation est enregistrée/i)).toBeVisible({
				timeout: 15_000,
			});

			// La demande est en base, liée à la commande.
			const prisma = getE2ePrisma();
			const retractation = await prisma.retractationRequest.findUnique({
				where: { orderId: order.id },
				select: { status: true, reason: true },
			});
			expect(retractation).not.toBeNull();
			expect(retractation!.reason).toBe("Trop grande pour moi");

			// Au rechargement, le suivi montre l'état de la demande, plus le bouton.
			await page.reload();
			await expect(page.getByText(/Ta rétractation/i)).toBeVisible();
			await expect(page.getByRole("button", { name: /Me rétracter/i })).toHaveCount(0);
		} finally {
			await cleanup(order.id);
		}
	});

	test("une seconde demande est refusée : une seule rétractation par commande (@unique orderId)", async ({
		page,
	}) => {
		const email = testEmail("retract-dup");
		const order = await createShippedOrder(email);
		const token = trackingToken(order.id, email);

		try {
			await page.goto(`/suivi-commande?commande=${order.id}&token=${token}`);
			await page.getByRole("button", { name: /Me rétracter/i }).click();
			await expect(page.getByRole("button", { name: /Envoyer ma demande/i })).toBeVisible();

			// Une demande concurrente aboutit AVANT la soumission (autre onglet, double
			// clic réparti) : le P2002 de `@unique(orderId)` doit produire le message
			// dédié de `request-retractation.ts`, pas une erreur générique.
			const prisma = getE2ePrisma();
			await prisma.retractationRequest.create({
				data: { orderId: order.id, status: "RECEIVED" },
			});

			await page.getByRole("button", { name: /Envoyer ma demande/i }).click();
			await expect(
				page.getByText(/Une demande de rétractation est déjà enregistrée pour cette commande/i),
			).toBeVisible({ timeout: 15_000 });

			// Vérité serveur : toujours UNE SEULE demande.
			expect(await prisma.retractationRequest.count({ where: { orderId: order.id } })).toBe(1);
		} finally {
			await cleanup(order.id);
		}
	});

	test("hors délai (14 j dépassés) : la demande reste soumettable — l'admin tranche", async ({
		page,
	}) => {
		const email = testEmail("retract-late");
		const order = await createShippedOrder(email);
		const prisma = getE2ePrisma();
		// Expédiée il y a 20 jours : fenêtre légale écoulée (proxy shippedAt,
		// cf. retractation-eligibility.service).
		await prisma.order.update({
			where: { id: order.id },
			data: { shippedAt: new Date(Date.now() - 20 * 86_400_000) },
		});
		const token = trackingToken(order.id, email);

		try {
			await page.goto(`/suivi-commande?commande=${order.id}&token=${token}`);

			// Le bouton reste là, avec la copy « hors délai » — c'est un droit de
			// demande, jamais un mur.
			const openFormButton = page.getByRole("button", { name: /Me rétracter/i });
			await expect(openFormButton).toBeVisible();
			await expect(page.getByText(/délai légal de 14 jours est dépassé/i)).toBeVisible();
			await openFormButton.click();

			await expect(page.getByText(/ta demande sera examinée à la main/i)).toBeVisible();
			// Motif optionnel : soumission sans se justifier.
			await page.getByRole("button", { name: /Envoyer ma demande/i }).click();

			await expect(page.getByText(/demande de rétractation est (bien )?enregistrée/i)).toBeVisible({
				timeout: 15_000,
			});

			// La demande existe bien en base (RECEIVED, ou ACKNOWLEDGED si l'accusé est parti).
			await expect
				.poll(() => prisma.retractationRequest.count({ where: { orderId: order.id } }), {
					timeout: 10_000,
				})
				.toBe(1);
			const retractation = await prisma.retractationRequest.findUnique({
				where: { orderId: order.id },
				select: { status: true },
			});
			expect(["RECEIVED", "ACKNOWLEDGED"]).toContain(retractation!.status);
		} finally {
			await cleanup(order.id);
		}
	});

	test("token faux : le suivi rend la page 404, jamais la commande", async ({ page }) => {
		const email = testEmail("retract-bad");
		const order = await createShippedOrder(email);

		try {
			await page.goto(`/suivi-commande?commande=${order.id}&token=${"0".repeat(64)}`);
			// Statut streamé 200 (PPR) — c'est le CONTENU qui fait foi (cf. lot 5).
			await expect(page.getByText(/Cliente E2E|Collier e2e/i)).toHaveCount(0);
			await expect(page.getByRole("button", { name: /Me rétracter/i })).toHaveCount(0);
		} finally {
			await cleanup(order.id);
		}
	});
});
