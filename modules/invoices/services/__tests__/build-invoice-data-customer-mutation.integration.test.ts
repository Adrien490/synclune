/**
 * @regression build-invoice-data-customer-mutation
 *
 * EINV-TEST-011 — Immutabilité facture après mutation Address/User.
 *
 * Invariant 5 (CLAUDE.md §Facturation) : Snapshots adresses figés sur Order
 * (`shipping*`) au checkout. Le modèle `User` du
 * client peut évoluer indépendamment (changement nom, déménagement) sans
 * affecter la facture archivée Art. L102 B LPF.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL. Skip silencieux sinon.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { persistInvoiceNumber } from "@/modules/orders/services/persist-invoice-number.service";
import { buildInvoiceData } from "../build-invoice-data";
import { GET_ORDER_SELECT_ADMIN } from "@/modules/orders/constants/order.constants";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { OrderStatus, PaymentStatus } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration(
	"buildInvoiceData — immutabilité post-mutation Address/User (EINV-TEST-011)",
	() => {
		let prisma: ReturnType<typeof getIntegrationPrismaClient>;

		beforeEach(() => {
			prisma = getIntegrationPrismaClient();
		});

		it("mutation User.name (changement client) ne modifie PAS l'InvoiceData reconstruit", async () => {
			const user = await createTestUser({ name: "Marie Dupont" });
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);

			const order = await prisma.order.create({
				data: {
					userId: user.id,
					orderNumber: `SYN-CUST-${Date.now()}`,
					customerEmail: user.email,
					customerName: "Marie Dupont", // Snapshot figé
					shippingFirstName: "Marie",
					shippingLastName: "Dupont",
					shippingAddress1: "12 rue de la Paix",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33612345678",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_cust_${Date.now()}`,
					subtotal: 4999,
					total: 4999,
					currency: "EUR",
					paymentMethod: "CARD",
					invoiceStatus: null,
					items: {
						create: [
							{
								skuId: sku.id,
								quantity: 1,
								productTitle: "Test",
								price: 4999,
							},
						],
					},
				},
			});
			await persistInvoiceNumber(order.id);

			// Snapshot AVANT
			const orderBefore = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const dataBefore = buildInvoiceData(orderBefore);

			// MUTATION User (changement civil)
			await prisma.user.update({
				where: { id: user.id },
				data: {
					name: "Marie Martin", // Mariage / nouveau nom légal
					email: "marie.martin@example.com",
				},
			});

			// Reconstruction AFTER : on relit l'order, pas le User
			const orderAfter = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const dataAfter = buildInvoiceData(orderAfter);

			// Buyer info DOIT rester "Marie Dupont" (snapshot Order)
			expect(dataAfter.buyer.firstName).toBe("Marie");
			expect(dataAfter.buyer.lastName).toBe("Dupont");
			expect(dataAfter.buyer.email).toBe(orderBefore.customerEmail);
			expect(dataAfter.buyer.firstName).toBe(dataBefore.buyer.firstName);
			expect(dataAfter.buyer.lastName).toBe(dataBefore.buyer.lastName);
		});

		it("mutation Address.line1 (déménagement) ne modifie PAS shippingAddress de la facture", async () => {
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);

			// L'Order capture l'adresse au checkout. Si le User a une Address dans
			// son profil, elle peut être modifiée ensuite sans impacter l'Order.
			const order = await prisma.order.create({
				data: {
					userId: user.id,
					orderNumber: `SYN-ADDR-${Date.now()}`,
					customerEmail: user.email,
					customerName: "Test Addr",
					shippingFirstName: "Address",
					shippingLastName: "Test",
					shippingAddress1: "10 rue de la Paix",
					shippingAddress2: "Apt 3B",
					shippingPostalCode: "75002",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33611111111",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_addr_${Date.now()}`,
					subtotal: 4999,
					total: 4999,
					currency: "EUR",
					paymentMethod: "CARD",
					invoiceStatus: null,
					items: {
						create: [
							{
								skuId: sku.id,
								quantity: 1,
								productTitle: "Test",
								price: 4999,
							},
						],
					},
				},
			});
			await persistInvoiceNumber(order.id);

			// MUTATION : l'utilisateur déménage et met à jour son adresse profile
			// (table Address — pas accessible directement ici puisque l'Order a
			// ses propres champs shipping*). On simule en mettant à jour User
			// pour matérialiser le concept "changement client".
			await prisma.user.update({
				where: { id: user.id },
				data: { name: "Address Renommé" },
			});

			// Reconstruction
			const orderAfter = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const data = buildInvoiceData(orderAfter);

			// shippingAddress doit rester strictement identique
			expect(data.shippingAddress.line1).toBe("10 rue de la Paix");
			expect(data.shippingAddress.line2).toBe("Apt 3B");
			expect(data.shippingAddress.postalCode).toBe("75002");
			expect(data.shippingAddress.city).toBe("Paris");
			expect(data.shippingAddress.countryCode).toBe("FR");
		});

		it("l'adresse de facturation (= le shipping figé) survit à la suppression du User", async () => {
			const user = await createTestUser();
			const product = await createTestProduct();
			const sku = await createTestSku(product.id);

			const order = await prisma.order.create({
				data: {
					userId: user.id,
					orderNumber: `SYN-DEL-USR-${Date.now()}`,
					customerEmail: user.email,
					customerName: "À supprimer",
					shippingFirstName: "Ship",
					shippingLastName: "Side",
					shippingAddress1: "1 rue ship",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33600000000",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_del_${Date.now()}`,
					subtotal: 4999,
					total: 4999,
					currency: "EUR",
					paymentMethod: "CARD",
					invoiceStatus: null,
					items: {
						create: [
							{
								skuId: sku.id,
								quantity: 1,
								productTitle: "Test",
								price: 4999,
							},
						],
					},
				},
			});
			await persistInvoiceNumber(order.id);

			// Soft delete User (RGPD droit à l'effacement après 10 ans conservation)
			await prisma.user.update({
				where: { id: user.id },
				data: { deletedAt: new Date() },
			});

			const orderAfter = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const data = buildInvoiceData(orderAfter);

			// Billing reste figé
			// Depuis le retrait des colonnes `billing*` (2026-08-04), l'adresse de
			// facturation EST le snapshot d'expédition figé sur la commande — c'est
			// lui qui doit survivre à la disparition du User (Art. L102 B LPF).
			expect(data.billingAddress).toEqual(data.shippingAddress);
			expect(data.billingAddress.line1).toBe("1 rue ship");

			// Shipping aussi
			expect(data.shippingAddress.line1).toBe("1 rue ship");

			// Buyer info aussi
			expect(data.buyer.firstName).toBe("À supprimer");
		});
	},
);
