/**
 * @regression build-invoice-data-immutability
 *
 * EINV-TEST-010 — Immutabilité facture après mutation Product/Sku.
 *
 * Invariant 4 (CLAUDE.md §Facturation) : Snapshots OrderItem (productTitle,
 * productImageUrl, skuColor, skuMaterial, skuSize, price, taxRate) sont figés
 * au checkout. Une mutation Product/Sku ne doit JAMAIS modifier un OrderItem
 * existant — donc `buildInvoiceData(order)` doit produire le même payload
 * avant et après mutation produit.
 *
 * Sans cette garantie : Art. L102 B LPF (facture reconstituable 10 ans à
 * l'identique) cassé silencieusement.
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
	"buildInvoiceData — immutabilité post-mutation Product/Sku (EINV-TEST-010)",
	() => {
		let prisma: ReturnType<typeof getIntegrationPrismaClient>;

		beforeEach(() => {
			prisma = getIntegrationPrismaClient();
		});

		it("mutation Product.title + Sku.priceInclTax ne modifie PAS l'InvoiceData reconstruit", async () => {
			const user = await createTestUser();
			const product = await createTestProduct({ title: "Collier Original" });
			const sku = await createTestSku(product.id, {
				priceInclTax: 4999,
			});

			const order = await prisma.order.create({
				data: {
					userId: user.id,
					orderNumber: `SYN-IMM-${Date.now()}`,
					customerEmail: "imm@test.local",
					customerName: "Imm Test",
					customerType: "B2C",
					shippingFirstName: "Im",
					shippingLastName: "M",
					shippingAddress1: "1 rue",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33600000000",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_imm_${Date.now()}`,
					subtotal: 4999,
					total: 4999,
					currency: "EUR",
					paymentMethod: "CARD",
					invoiceStatus: "PENDING",
					items: {
						create: [
							{
								skuId: sku.id,
								quantity: 1,
								// Snapshots figés au checkout (pas relus depuis Product.current)
								productTitle: "Collier Original",
								skuColor: "Argent",
								skuMaterial: "Argent 925",
								price: 4999,
								taxRate: 0,
								taxAmount: 0,
								lineTotalExcludingTax: 4999,
								lineTotalIncludingTax: 4999,
								taxCategoryCode: "ZB",
							},
						],
					},
				},
			});
			await persistInvoiceNumber(order.id, user.id);

			// Snapshot AVANT mutation
			const orderBefore = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const dataBefore = buildInvoiceData(orderBefore);

			// MUTATION PRODUCT/SKU côté admin (post-facturation)
			await prisma.product.update({
				where: { id: product.id },
				data: { title: "Collier Modifié Hack" },
			});
			await prisma.productSku.update({
				where: { id: sku.id },
				data: { priceInclTax: 99 },
			});

			// Snapshot APRÈS mutation
			const orderAfter = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const dataAfter = buildInvoiceData(orderAfter);

			// L'InvoiceData reconstruit doit être IDENTIQUE
			expect(dataAfter.lines[0]!.productTitle).toBe("Collier Original");
			expect(dataAfter.lines[0]!.productTitle).not.toBe("Collier Modifié Hack");
			expect(dataAfter.lines[0]!.unitPriceExclTax).toBe(4999);
			expect(dataAfter.lines[0]!.unitPriceExclTax).not.toBe(99);

			// Snapshots strictement équivalents (sauf dates qui ne devraient pas avoir changé)
			expect(JSON.stringify(dataAfter.lines)).toBe(JSON.stringify(dataBefore.lines));
			expect(dataAfter.totals).toEqual(dataBefore.totals);
		});

		it("suppression Product (soft delete) ne casse pas la régénération de la facture", async () => {
			const user = await createTestUser();
			const product = await createTestProduct({ title: "Bague Discontinuée" });
			const sku = await createTestSku(product.id);

			const order = await prisma.order.create({
				data: {
					userId: user.id,
					orderNumber: `SYN-IMM-DEL-${Date.now()}`,
					customerEmail: "del@test.local",
					customerName: "Del Test",
					customerType: "B2C",
					shippingFirstName: "D",
					shippingLastName: "E",
					shippingAddress1: "1 rue",
					shippingPostalCode: "75001",
					shippingCity: "Paris",
					shippingCountry: "FR",
					shippingPhone: "+33600000000",
					status: OrderStatus.PROCESSING,
					paymentStatus: PaymentStatus.PAID,
					paidAt: new Date(),
					stripePaymentIntentId: `pi_imm_del_${Date.now()}`,
					subtotal: 4999,
					total: 4999,
					currency: "EUR",
					paymentMethod: "CARD",
					invoiceStatus: "PENDING",
					items: {
						create: [
							{
								skuId: sku.id,
								quantity: 1,
								productTitle: "Bague Discontinuée",
								skuMaterial: "Or jaune",
								price: 4999,
								taxRate: 0,
								taxAmount: 0,
								lineTotalExcludingTax: 4999,
								lineTotalIncludingTax: 4999,
								taxCategoryCode: "ZB",
							},
						],
					},
				},
			});
			await persistInvoiceNumber(order.id, user.id);

			// Soft delete du Product (admin retire le produit du catalogue)
			await prisma.product.update({
				where: { id: product.id },
				data: { deletedAt: new Date() },
			});

			// La facture reste reconstituable
			const orderAfter = (await prisma.order.findUniqueOrThrow({
				where: { id: order.id },
				select: GET_ORDER_SELECT_ADMIN,
			})) as GetOrderReturn;
			const data = buildInvoiceData(orderAfter);

			expect(data.lines[0]!.productTitle).toBe("Bague Discontinuée");
			expect(data.lines[0]!.unitPriceExclTax).toBe(4999);
			expect(data.totals.totalInclTax).toBe(4999);
		});
	},
);
