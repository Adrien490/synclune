import { createHmac } from "node:crypto";
import { Prisma } from "../app/generated/prisma/client";
import { DEFAULT_FRANCHISE_VAT_MENTION } from "../shared/constants/vat-franchise";
import { expect, test } from "./fixtures";
import { getE2ePrisma } from "./helpers/db";
import { testEmail } from "./helpers/test-run";

/**
 * Suivi de commande invité + facture + avoir — le SEUL accès client à une
 * commande (token HMAC), doctrine retractation.spec.ts.
 *
 * Chaque test crée SA commande PAID en base (email e2e — ramassée par le
 * teardown global si le nettoyage in-spec échoue) et recalcule le token avec
 * la même recette que `modules/orders/lib/order-tracking-token.ts` :
 * HMAC-SHA256(`orderId:email` minuscule) signé `AUTH_SECRET`.
 *
 * ⚠️ `invoiceNumber` est `@unique` et séquentiel (max+1 au webhook) : on prend
 * le max+1 RÉEL, avec retry P2002 — un webhook du run peut prendre le même
 * numéro entre notre lecture et notre écriture. La commande est supprimée en
 * finally (le trou de séquence est sans conséquence en base de test).
 * Idem pour `creditNoteNumber` (compteur DISTINCT sur RetractationRequest).
 *
 * Chromium uniquement : écritures en base à chaque passage.
 */

const EURO = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const formatEuro = (cents: number) => EURO.format(cents / 100);

const ITEM_PRICE = 3800;
const SHIPPING = 499;
const TOTAL = ITEM_PRICE + SHIPPING;

test.describe("Suivi de commande, facture et avoir @critical", () => {
	test.describe.configure({ timeout: 60_000 });
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

	/** Commande PAID complète (snapshots + adresse), invoiceNumber = max+1 réel. */
	async function createPaidOrder(email: string, status: "PAID" | "REFUNDED" = "PAID") {
		const prisma = getE2ePrisma();
		for (let attempt = 0; attempt < 3; attempt++) {
			const max =
				(await prisma.order.aggregate({ _max: { invoiceNumber: true } }))._max.invoiceNumber ?? 0;
			try {
				return await prisma.order.create({
					data: {
						stripeSessionId: `pending_e2e_${Date.now()}_${Math.random().toString(36).slice(2)}`,
						status,
						invoiceNumber: max + 1 + attempt,
						email,
						customerName: "Cliente E2E",
						shippingLine1: "1 rue du Test",
						shippingZip: "44000",
						shippingCity: "Nantes",
						shippingCountry: "FR",
						amountItemsCents: ITEM_PRICE,
						amountShippingCents: SHIPPING,
						amountTotalCents: TOTAL,
						items: {
							create: [
								{
									nameSnapshot: "Collier e2e",
									variantSnapshot: "Rose bonbon",
									unitPriceCents: ITEM_PRICE,
									quantity: 1,
								},
							],
						},
					},
					select: { id: true, invoiceNumber: true },
				});
			} catch (e) {
				// Un webhook concurrent du run a pris le numéro : on recalcule.
				if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
				throw e;
			}
		}
		throw new Error("invoiceNumber : 3 collisions consécutives — run trop concurrent ?");
	}

	/** Rétractation REFUNDED avec avoir, creditNoteNumber = max+1 réel. */
	async function createRefundedRetractation(orderId: string) {
		const prisma = getE2ePrisma();
		for (let attempt = 0; attempt < 3; attempt++) {
			const max =
				(await prisma.retractationRequest.aggregate({ _max: { creditNoteNumber: true } }))._max
					.creditNoteNumber ?? 0;
			try {
				return await prisma.retractationRequest.create({
					data: {
						orderId,
						status: "REFUNDED",
						reason: "Rétractation e2e",
						acknowledgedAt: new Date(),
						itemReceivedAt: new Date(),
						refundedAt: new Date(),
						stripeRefundId: `re_e2e_${Date.now()}`,
						creditNoteNumber: max + 1 + attempt,
					},
					select: { id: true, creditNoteNumber: true },
				});
			} catch (e) {
				if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
				throw e;
			}
		}
		throw new Error("creditNoteNumber : 3 collisions consécutives — run trop concurrent ?");
	}

	async function cleanup(orderId: string) {
		const prisma = getE2ePrisma();
		// La rétractation d'abord : la FK Order ← RetractationRequest est Restrict.
		await prisma.retractationRequest.deleteMany({ where: { orderId } });
		await prisma.order.deleteMany({ where: { id: orderId } });
	}

	test("suivi nominal : statut, lignes snapshots, totaux — et jamais l'email en clair", async ({
		page,
	}) => {
		const email = testEmail("tracking");
		const order = await createPaidOrder(email);
		const token = trackingToken(order.id, email);

		try {
			await page.goto(`/suivi-commande?commande=${order.id}&token=${token}`);

			await expect(
				page.getByRole("heading", { name: `Commande n° ${order.invoiceNumber}` }),
			).toBeVisible();
			// Statut PAID : message de préparation atelier.
			await expect(page.getByText(/Ta commande est confirmée/)).toBeVisible();

			// Lignes = SNAPSHOTS (nom, variante, quantité × prix unitaire).
			await expect(page.getByText("Collier e2e")).toBeVisible();
			await expect(
				page.getByText(`Rose bonbon · 1 × ${formatEuro(ITEM_PRICE)}`, { exact: true }),
			).toBeVisible();
			await expect(page.getByText(formatEuro(SHIPPING), { exact: true })).toBeVisible();
			await expect(page.getByText(formatEuro(TOTAL), { exact: true })).toBeVisible();

			// Adresse de livraison rendue, mais l'EMAIL n'apparaît nulle part sur le suivi.
			await expect(page.getByText("Cliente E2E").first()).toBeVisible();
			await expect(page.getByText("1 rue du Test")).toBeVisible();
			await expect(page.getByText(email)).toHaveCount(0);

			// La facture est accessible (numéro attribué).
			await expect(page.getByRole("link", { name: /Voir ma facture/i })).toBeVisible();
		} finally {
			await cleanup(order.id);
		}
	});

	test("facture : mention 293 B exacte, numéro, snapshots, vendeur — et fail-closed sur token altéré", async ({
		page,
	}) => {
		const email = testEmail("invoice");
		const order = await createPaidOrder(email);
		const token = trackingToken(order.id, email);

		try {
			await page.goto(`/suivi-commande/facture?commande=${order.id}&token=${token}`);

			await expect(
				page.getByRole("heading", { name: `Facture n° ${order.invoiceNumber}` }),
			).toBeVisible();

			// Mention de franchise de TVA : la CONSTANTE SSOT, au caractère près.
			await expect(page.getByText(DEFAULT_FRANCHISE_VAT_MENTION).first()).toBeVisible();

			// Identité vendeur (valeurs d'env : on asserte la structure, pas les valeurs).
			await expect(page.getByRole("heading", { name: "Vendeur" })).toBeVisible();
			await expect(page.getByText(/SIREN :/).first()).toBeVisible();

			// Facturé à : la facture, elle, porte l'email de la cliente.
			await expect(page.getByRole("heading", { name: "Facturé à" })).toBeVisible();
			await expect(page.getByText(email)).toBeVisible();

			// Lignes snapshots + totaux.
			await expect(page.getByText("Collier e2e")).toBeVisible();
			await expect(page.getByText(/Rose bonbon/)).toBeVisible();
			await expect(page.getByText(formatEuro(ITEM_PRICE), { exact: true }).first()).toBeVisible();
			await expect(page.getByText(formatEuro(SHIPPING), { exact: true })).toBeVisible();
			await expect(page.getByText(formatEuro(TOTAL), { exact: true })).toBeVisible();

			// Fail-closed : token au bon format mais faux → 404 par CONTENU
			// (statut streamé 200 possible, PPR — cf. retractation.spec.ts).
			await page.goto(`/suivi-commande/facture?commande=${order.id}&token=${"0".repeat(64)}`);
			await expect(page.getByText(/Facture n°/)).toHaveCount(0);
			await expect(page.getByText(/Collier e2e|Cliente E2E/)).toHaveCount(0);
			await expect(page.getByText(email)).toHaveCount(0);
		} finally {
			await cleanup(order.id);
		}
	});

	test("avoir : numéro distinct, montant remboursé, référence de la facture d'origine", async ({
		page,
	}) => {
		const email = testEmail("credit-note");
		const order = await createPaidOrder(email, "REFUNDED");
		const token = trackingToken(order.id, email);
		const retractation = await createRefundedRetractation(order.id);

		try {
			// Le suivi expose le lien vers l'avoir une fois la demande REFUNDED.
			await page.goto(`/suivi-commande?commande=${order.id}&token=${token}`);
			await expect(page.getByText(/Ta commande a été remboursée/)).toBeVisible();
			await expect(
				page.getByRole("link", {
					name: `Voir mon avoir (n° ${retractation.creditNoteNumber})`,
				}),
			).toBeVisible();

			await page.goto(`/suivi-commande/avoir?commande=${order.id}&token=${token}`);
			await expect(
				page.getByRole("heading", { name: `Avoir n° ${retractation.creditNoteNumber}` }),
			).toBeVisible();
			// Référence de la facture d'origine (art. 272-I) — en-tête + ligne unique.
			await expect(page.getByText(`Sur facture n° ${order.invoiceNumber} du`)).toBeVisible();
			await expect(
				page.getByText(`Remboursement sur facture n° ${order.invoiceNumber} (rétractation)`),
			).toBeVisible();
			// UNE ligne au montant remboursé (négatif), reprise en total.
			await expect(page.getByText(`-${formatEuro(TOTAL)}`, { exact: true })).toHaveCount(2);
			await expect(page.getByText("Total remboursé")).toBeVisible();
			await expect(page.getByText(DEFAULT_FRANCHISE_VAT_MENTION).first()).toBeVisible();
		} finally {
			await cleanup(order.id);
		}
	});
});
