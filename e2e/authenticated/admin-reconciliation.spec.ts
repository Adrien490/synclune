import Stripe from "stripe";
import { expect, test } from "../fixtures";
import { getE2ePrisma } from "../helpers/db";
import { testEmail, testName } from "../helpers/test-run";
import { hasRealStripeCredentials } from "../constants";

/**
 * Réconciliation admin — « Vérifier les commandes en attente »
 * (`modules/orders/actions/reconcile-pending-orders.ts`), le remplaçant des
 * crons : PENDING > 24 h → `checkout.sessions.retrieve` → application de
 * l'état RÉEL (expirée → CANCELLED + restock, même transaction que le webhook).
 *
 * Le test crée une VRAIE session Checkout via le SDK Stripe (clé test de
 * l'env), l'expire via l'API, vieillit la commande à −25 h, puis clique le
 * bouton. ⚠️ La réconciliation lie commande ↔ session par
 * `Order.stripeSessionId` (elle ne lit PAS `metadata.orderId`) : c'est cette
 * colonne que le test ancre sur la session réelle.
 *
 * Projet `authenticated-admin` (Desktop Chrome uniquement) : effets de bord
 * réels côté Stripe — pas de multi-navigateur.
 */
test.describe("Admin réconciliation des commandes en attente", () => {
	// Vrais allers-retours Stripe + polls DB : la limite par défaut (30 s) est
	// trop courte sous la charge d'un run complet.
	test.describe.configure({ timeout: 120_000 });
	test.skip(
		!hasRealStripeCredentials() || !process.env.DATABASE_URL,
		"Clés Stripe RÉELLES / DATABASE_URL requises",
	);

	test("PENDING > 24 h à session expirée → CANCELLED + stock restitué", async ({ page }) => {
		const prisma = getE2ePrisma();
		const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

		// Produit + variante de test : stock à 1 comme si 1 exemplaire (sur 2)
		// était encore RÉSERVÉ par la commande PENDING orpheline.
		const product = await prisma.product.create({
			data: {
				slug: `${testName("reconciliation").toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
				name: testName("Bijou Réconciliation"),
				description: "Produit créé par les tests E2E (réconciliation).",
				priceCents: 1500,
				active: false,
				variants: { create: { stock: 1, size: "E2E-R" } },
			},
			select: { id: true, variants: { select: { id: true } } },
		});
		const variantId = product.variants[0]!.id;

		let orderId: string | null = null;
		try {
			// Session Checkout réelle, puis EXPIRÉE via l'API — l'état que la
			// réconciliation doit découvrir en interrogeant Stripe.
			const session = await stripe.checkout.sessions.create({
				mode: "payment",
				line_items: [
					{
						quantity: 1,
						price_data: {
							currency: "eur",
							unit_amount: 1500,
							product_data: { name: "Bijou e2e réconciliation" },
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
					email: testEmail("reconciliation"),
					amountItemsCents: 1500,
					amountShippingCents: 499,
					amountTotalCents: 1999,
					// Vieillie d'emblée : le cutoff de la réconciliation est 24 h.
					createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
					items: {
						create: [
							{
								variantId,
								nameSnapshot: "Bijou e2e réconciliation",
								variantSnapshot: "E2E-R",
								unitPriceCents: 1500,
								quantity: 1,
							},
						],
					},
				},
				select: { id: true },
			});
			orderId = order.id;

			await stripe.checkout.sessions.expire(session.id);

			await page.goto("/admin/ventes/commandes");
			await expect(page.getByRole("heading", { level: 1, name: /Commandes/i })).toBeVisible();

			const reconcileButton = page.getByRole("button", {
				name: /Vérifier les commandes en attente/i,
			});
			await expect(reconcileButton).toBeVisible();

			// Le clic peut précéder l'hydratation, et la réconciliation traite les
			// PENDING par lots de 25 (les plus anciennes d'abord) : on re-clique
			// jusqu'à ce que NOTRE commande soit passée CANCELLED en base.
			await expect(async () => {
				await reconcileButton.click();
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
			}).toPass({ timeout: 90_000, intervals: [1_000] });

			// Restock exactement-une-fois, dans la même transaction que la transition.
			const variantAfter = await prisma.productVariant.findUnique({
				where: { id: variantId },
				select: { stock: true },
			});
			expect(variantAfter?.stock).toBe(2);
		} finally {
			if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
			await prisma.product.deleteMany({ where: { id: product.id } });
		}
	});
});
