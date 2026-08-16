import Stripe from "stripe";
import { expect, test } from "../fixtures";
import { getE2ePrisma } from "../helpers/db";
import { testEmail, testName } from "../helpers/test-run";
import { hasRealStripeCredentials } from "../constants";

/**
 * Admin commandes — schéma lean (lot 4) : liste (recherche, filtre statut),
 * détail en snapshots, et les DEUX transitions du monde lean :
 * « Marquer expédiée » (PAID→SHIPPED) et « Annuler » (PENDING→CANCELLED).
 * Remplace les trois specs de l'ancien monde (7 statuts, notes, factures
 * PDF, renvoi d'email) supprimés au lot 7.
 *
 * Chaque test crée SA commande (email e2e — teardown-safe) et la nettoie.
 */
test.describe("Admin commandes", () => {
	test.skip(!process.env.DATABASE_URL, "DATABASE_URL requis (création de commandes)");

	async function createOrder(params: {
		emailSuffix: string;
		status: "PAID" | "PENDING";
		invoiceNumber?: number;
	}) {
		const prisma = getE2ePrisma();
		return prisma.order.create({
			data: {
				stripeSessionId: `pending_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`,
				status: params.status,
				invoiceNumber: params.invoiceNumber ?? null,
				email: testEmail(params.emailSuffix),
				customerName: "Cliente E2E Commandes",
				shippingLine1: "1 rue du Test",
				shippingZip: "44000",
				shippingCity: "Nantes",
				shippingCountry: "FR",
				amountItemsCents: 3800,
				amountShippingCents: 499,
				amountTotalCents: 4299,
				items: {
					create: [
						{
							nameSnapshot: "Collier e2e",
							variantSnapshot: "Rose bonbon · Perles",
							unitPriceCents: 3800,
							quantity: 1,
						},
					],
				},
			},
			select: { id: true, email: true },
		});
	}

	async function cleanup(orderId: string) {
		await getE2ePrisma().order.deleteMany({ where: { id: orderId } });
	}

	test("liste : la commande apparaît, la recherche par email la retrouve", async ({
		page,
		adminPage,
	}) => {
		const order = await createOrder({
			emailSuffix: "orders-list",
			status: "PAID",
			invoiceNumber: 99991,
		});

		try {
			await adminPage.gotoOrders();
			await expect(page.getByRole("heading", { level: 1, name: /Commandes/i })).toBeVisible();

			// ⚠️ Pas d'assertion sur la liste NUE : son entrée de cache (profil
			// `user`) peut précéder la création Prisma — seule une Server Action
			// l'invalide. La recherche par email est le chemin fiable : sa clé de
			// cache (args) est neuve, donc la lecture est fraîche.
			await page.goto(`/admin/ventes/commandes?search=${encodeURIComponent(order.email)}`);
			await expect(page.getByRole("link", { name: /n° 99991/i }).first()).toBeVisible();
			await expect(page.getByText(order.email).first()).toBeVisible();
		} finally {
			await cleanup(order.id);
		}
	});

	test("détail : snapshots, adresse, total — et « Marquer expédiée » exige un numéro de suivi", async ({
		page,
	}) => {
		const order = await createOrder({
			emailSuffix: "orders-ship",
			status: "PAID",
			invoiceNumber: 99992,
		});

		try {
			await page.goto(`/admin/ventes/commandes/${order.id}`);

			// Snapshots UNIQUEMENT — le détail ne re-joint jamais le produit vivant.
			await expect(page.getByRole("heading", { name: /Commande n° 99992/i })).toBeVisible();
			await expect(page.getByText("Collier e2e")).toBeVisible();
			await expect(page.getByText(/Rose bonbon · Perles/)).toBeVisible();
			await expect(page.getByText("Cliente E2E Commandes").first()).toBeVisible();
			await expect(page.getByText(/44000 Nantes/)).toBeVisible();
			await expect(page.getByText(/42,99/).first()).toBeVisible();

			// « Marquer expédiée » : la confirmation reste désactivée sans numéro
			// (confirmDisabled — une contrainte HTML ne serait jamais rapportée).
			await page.getByRole("button", { name: /Marquer expédiée/i }).click();
			const dialog = page.getByRole("alertdialog");
			const confirm = dialog.getByRole("button", { name: /Confirmer l'expédition/i });
			await expect(confirm).toBeDisabled();

			await dialog.getByLabel(/Numéro de suivi/i).fill("6A12345678901");
			await expect(confirm).toBeEnabled();
			await confirm.click();

			// PAID → SHIPPED — poll la BASE : une assertion UI matcherait le texte
			// du bouton « Marquer expédiée » avant même la fin de l'action.
			await expect
				.poll(
					async () =>
						(
							await getE2ePrisma().order.findUnique({
								where: { id: order.id },
								select: { status: true },
							})
						)?.status,
					{ timeout: 15_000 },
				)
				.toBe("SHIPPED");
			const after = await getE2ePrisma().order.findUnique({
				where: { id: order.id },
				select: { shippedAt: true, trackingNumber: true },
			});
			expect(after?.shippedAt).not.toBeNull();
			expect(after?.trackingNumber).toBe("6A12345678901");
		} finally {
			await cleanup(order.id);
		}
	});

	// ⚠️ Le `stripeSessionId` préfixé `pending_e2e_` de `createOrder` ESQUIVE la
	// branche Stripe de `cancelOrder` (le préfixe `pending_` est le placeholder
	// « session jamais créée », court-circuité avant tout appel API) : ce test ne
	// couvre que la transition DB. La branche réelle (expiration de session +
	// restock) est couverte par le test « session Stripe réelle » ci-dessous.
	test("« Annuler » une commande en attente la passe CANCELLED", async ({ page }) => {
		const order = await createOrder({ emailSuffix: "orders-cancel", status: "PENDING" });

		try {
			await page.goto(`/admin/ventes/commandes/${order.id}`);
			await expect(page.getByText(/En attente de paiement/i).first()).toBeVisible();

			await page.getByRole("button", { name: /Annuler la commande/i }).click();
			await page
				.getByRole("alertdialog")
				.getByRole("button", { name: /Annuler la commande/i })
				.click();

			await expect
				.poll(
					async () =>
						(
							await getE2ePrisma().order.findUnique({
								where: { id: order.id },
								select: { status: true },
							})
						)?.status,
					{ timeout: 15_000 },
				)
				.toBe("CANCELLED");
		} finally {
			await cleanup(order.id);
		}
	});

	test("« Annuler » avec session Stripe réelle : session expirée + stock restitué", async ({
		page,
	}) => {
		// Vrais allers-retours Stripe : plus long que la limite par défaut.
		test.setTimeout(120_000);
		test.skip(!hasRealStripeCredentials(), "Clés Stripe RÉELLES requises (session réelle)");

		const prisma = getE2ePrisma();
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

		// Variante avec stock DÉCRÉMENTÉ (1 exemplaire réservé sur 2) : c'est le
		// restock — invérifiable sur un OrderItem sans variantId — qu'on verrouille.
		const product = await prisma.product.create({
			data: {
				slug: `${testName("orders-cancel-stripe").toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
				name: testName("Bijou Annulation Stripe"),
				description: "Produit créé par les tests E2E (annulation Stripe).",
				priceCents: 2100,
				active: false,
				variants: { create: { stock: 1, size: "E2E-C" } },
			},
			select: { id: true, variants: { select: { id: true } } },
		});
		const variantId = product.variants[0]!.id;

		let orderId: string | null = null;
		try {
			// Session Checkout réelle, laissée OUVERTE : `cancelOrder` doit
			// l'expirer LUI-MÊME avant la transition (sinon la cliente pourrait
			// encore payer une commande annulée).
			const session = await stripe.checkout.sessions.create({
				mode: "payment",
				line_items: [
					{
						quantity: 1,
						price_data: {
							currency: "eur",
							unit_amount: 2100,
							product_data: { name: "Bijou e2e annulation" },
						},
					},
				],
				success_url: "http://localhost:3000/paiement/retour?session_id={CHECKOUT_SESSION_ID}",
				cancel_url: "http://localhost:3000/paiement/annulation",
			});

			const order = await prisma.order.create({
				data: {
					stripeSessionId: session.id,
					status: "PENDING",
					email: testEmail("orders-cancel-stripe"),
					amountItemsCents: 2100,
					amountShippingCents: 499,
					amountTotalCents: 2599,
					items: {
						create: [
							{
								variantId,
								nameSnapshot: "Bijou e2e annulation",
								variantSnapshot: "E2E-C",
								unitPriceCents: 2100,
								quantity: 1,
							},
						],
					},
				},
				select: { id: true },
			});
			orderId = order.id;

			await page.goto(`/admin/ventes/commandes/${order.id}`);
			await expect(page.getByText(/En attente de paiement/i).first()).toBeVisible();

			await page.getByRole("button", { name: /Annuler la commande/i }).click();
			await page
				.getByRole("alertdialog")
				.getByRole("button", { name: /Annuler la commande/i })
				.click();

			// 1. Transition DB (poll la BASE, doctrine).
			await expect
				.poll(
					async () =>
						(
							await prisma.order.findUnique({
								where: { id: order.id },
								select: { status: true },
							})
						)?.status,
					{ timeout: 20_000 },
				)
				.toBe("CANCELLED");

			// 2. Stock restitué (restock atomique avec la transition).
			const variantAfter = await prisma.productVariant.findUnique({
				where: { id: variantId },
				select: { stock: true },
			});
			expect(variantAfter?.stock).toBe(2);

			// 3. La porte Stripe est bien FERMÉE : session expirée côté Stripe.
			const sessionAfter = await stripe.checkout.sessions.retrieve(session.id);
			expect(sessionAfter.status).toBe("expired");
		} finally {
			if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
			await prisma.product.deleteMany({ where: { id: product.id } });
		}
	});

	test("recharger la liste conserve la session admin", async ({ page, adminPage }) => {
		await adminPage.gotoOrders();
		await page.reload();
		await expect(page).not.toHaveURL(/\/admin\/connexion/);
		await expect(page.getByRole("heading", { level: 1, name: /Commandes/i })).toBeVisible();
	});
});
