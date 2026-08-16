import { expect, test } from "./fixtures";
import { getE2ePrisma } from "./helpers/db";
import { completeSessionViaWebhook, expireSessionViaWebhook } from "./helpers/stripe-webhook";
import { testEmail } from "./helpers/test-run";

/**
 * Checkout Stripe HÉBERGÉ — le parcours argent (lot 7).
 *
 * On teste JUSQU'AU redirect vers checkout.stripe.com : la page hébergée
 * Stripe n'est JAMAIS pilotée par Playwright. La suite du flux (webhook →
 * PAID → confirmation) se teste en injectant des events SIGNÉS sur la route
 * webhook (`generateTestHeaderString`).
 *
 * Chromium uniquement : chaque passage crée une VRAIE session Stripe test et
 * réserve du stock — cinq navigateurs multiplieraient les effets de bord.
 * Le multi-navigateur du récapitulatif /paiement est couvert par
 * checkout.spec.ts (lecture seule).
 */
test.describe("Checkout hébergé @critical", () => {
	// Chaque test fait de VRAIS allers-retours Stripe (création de session
	// Checkout) + un webhook signé + des polls DB : sous la charge d'un run
	// complet (14 workers), les 30s par défaut sont dépassées sans qu'aucune
	// étape ne soit en faute.
	test.describe.configure({ timeout: 90_000 });
	test.skip(
		({ browserName }) => browserName !== "chromium",
		"Flux à effets de bord (session Stripe réelle + stock) — chromium seul",
	);
	test.skip(
		!process.env.STRIPE_WEBHOOK_SECRET || !process.env.DATABASE_URL,
		"STRIPE_WEBHOOK_SECRET / DATABASE_URL requis",
	);

	/** Restocke et supprime la commande créée par la session — nettoyage dur. */
	async function cleanupOrderBySession(sessionId: string) {
		const prisma = getE2ePrisma();
		const order = await prisma.order.findUnique({
			where: { stripeSessionId: sessionId },
			select: { id: true, status: true, items: { select: { variantId: true, quantity: true } } },
		});
		if (!order) return;
		// Une commande CANCELLED a déjà été restockée par le webhook expired.
		if (order.status !== "CANCELLED") {
			for (const item of order.items) {
				if (!item.variantId) continue;
				await prisma.productVariant.updateMany({
					where: { id: item.variantId },
					data: { stock: { increment: item.quantity } },
				});
			}
		}
		await prisma.order.delete({ where: { id: order.id } });
	}

	test("panier → /paiement → redirect checkout.stripe.com, puis expiration → restock", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		await checkoutPage.payButton.click();
		await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

		// L'URL hébergée porte l'id de session (…/c/pay/cs_test_…).
		const sessionId = /cs_(test|live)_[A-Za-z0-9]+/.exec(page.url())?.[0];
		expect(sessionId, "id de session absent de l'URL Stripe").toBeTruthy();

		try {
			// La réservation existe : commande PENDING ancrée sur la session.
			const prisma = getE2ePrisma();
			const order = await prisma.order.findUnique({
				where: { stripeSessionId: sessionId! },
				select: { status: true, items: { select: { variantId: true, quantity: true } } },
			});
			expect(order?.status).toBe("PENDING");
			const variantId = order!.items[0]!.variantId!;
			const stockBefore = (await prisma.productVariant.findUnique({
				where: { id: variantId },
				select: { stock: true },
			}))!.stock;

			// Abandon : l'event expired signé rend le stock, exactement une fois.
			expect(await expireSessionViaWebhook(sessionId!)).toBe(200);
			const after = await prisma.order.findUnique({
				where: { stripeSessionId: sessionId! },
				select: { status: true },
			});
			expect(after?.status).toBe("CANCELLED");
			const stockAfter = (await prisma.productVariant.findUnique({
				where: { id: variantId },
				select: { stock: true },
			}))!.stock;
			expect(stockAfter).toBe(stockBefore + order!.items[0]!.quantity);

			// Rejeu → no-op (le stock ne regonfle pas).
			expect(await expireSessionViaWebhook(sessionId!)).toBe(200);
			const stockReplay = (await prisma.productVariant.findUnique({
				where: { id: variantId },
				select: { stock: true },
			}))!.stock;
			expect(stockReplay).toBe(stockAfter);
		} finally {
			await cleanupOrderBySession(sessionId!);
		}
	});

	test("webhook completed → commande PAID + numéro de facture + page de confirmation", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		await checkoutPage.payButton.click();
		await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
		const sessionId = /cs_(test|live)_[A-Za-z0-9]+/.exec(page.url())?.[0];
		expect(sessionId).toBeTruthy();

		try {
			// « Paiement » : event completed signé, email e2e (teardown-safe).
			expect(
				await completeSessionViaWebhook({ sessionId: sessionId!, email: testEmail("checkout") }),
			).toBe(200);

			const prisma = getE2ePrisma();
			const order = await prisma.order.findUnique({
				where: { stripeSessionId: sessionId! },
				select: { status: true, invoiceNumber: true },
			});
			expect(order?.status).toBe("PAID");
			expect(order?.invoiceNumber).not.toBeNull();

			// La landing du success_url lit la commande — le webhook est le seul écrivain.
			await page.goto(`/paiement/retour?session_id=${sessionId}`);
			await expect(page.getByRole("heading", { name: /Merci pour ta commande/i })).toBeVisible();

			// Le retour vide le panier cookie (ClearCartOnMount) : l'action serveur
			// `clearCartAfterOrder` part au montage de /paiement/retour et peut
			// répondre APRÈS notre navigation — on re-visite /paiement jusqu'à voir
			// l'état vide. `.first()` : le h1 est brièvement dupliqué par le
			// streaming PPR (shell + contenu), strict mode sinon.
			await expect(async () => {
				await page.goto("/paiement");
				await expect(
					page.getByRole("heading", { name: /Ton panier est vide/i }).first(),
				).toBeVisible({ timeout: 3000 });
			}).toPass({ timeout: 20_000 });
		} finally {
			await cleanupOrderBySession(sessionId!);
		}
	});

	test("rejeu du webhook completed → no-op : statut PAID conservé, MÊME numéro de facture", async ({
		page,
		checkoutPage,
		productCatalogPage,
		cartPage,
	}) => {
		const seeded = await checkoutPage.gotoWithSeededCart(productCatalogPage, cartPage);
		test.skip(seeded.skipped, seeded.skipped ? seeded.reason : "");

		await checkoutPage.payButton.click();
		await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
		const sessionId = /cs_(test|live)_[A-Za-z0-9]+/.exec(page.url())?.[0];
		expect(sessionId).toBeTruthy();

		try {
			const email = testEmail("replay");
			expect(await completeSessionViaWebhook({ sessionId: sessionId!, email })).toBe(200);

			const prisma = getE2ePrisma();
			const first = await prisma.order.findUnique({
				where: { stripeSessionId: sessionId! },
				select: { status: true, invoiceNumber: true },
			});
			expect(first?.status).toBe("PAID");
			expect(first?.invoiceNumber).not.toBeNull();

			// Stripe redélivre : DEUXIÈME event completed signé, même session. La
			// garde de transition `updateMany({ stripeSessionId, status: PENDING })`
			// rend le rejeu inerte — 200 (sinon Stripe redélivrerait encore), sans
			// nouvelle attribution de numéro ni commande dupliquée.
			expect(await completeSessionViaWebhook({ sessionId: sessionId!, email })).toBe(200);

			const after = await prisma.order.findUnique({
				where: { stripeSessionId: sessionId! },
				select: { status: true, invoiceNumber: true },
			});
			expect(after?.status).toBe("PAID");
			expect(after?.invoiceNumber).toBe(first!.invoiceNumber);

			// Pas de doublon : une seule commande pour cet email de test.
			expect(await prisma.order.count({ where: { email } })).toBe(1);
		} finally {
			await cleanupOrderBySession(sessionId!);
		}
	});
});
