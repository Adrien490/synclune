/**
 * @regression archive-invoice-pdf-hash-verification
 *
 * EINV-TEST-013 — Vérification SHA-256 de l'archive UploadThing.
 *
 * Art. L102 B LPF : le PDF archivé doit être bit-à-bit identique à son hash
 * persisté. Sans cette garantie, une corruption silencieuse côté UploadThing
 * (rare mais théoriquement possible) compromettrait la non-répudiation
 * comptable sur 10 ans.
 *
 * Ce test valide la propriété d'archivage en DB (le hash persisté correspond
 * bien au buffer servi) et le comportement idempotent : un 2e appel sur le
 * même order retourne le hash existant sans ré-uploader.
 *
 * Le fetch réel UploadThing + comparaison hash est testé dans le test unitaire
 * `archive-invoice-pdf.service.test.ts`. Ici on vérifie la cohérence DB après
 * archivage : `invoicePdfHash` = SHA-256(buffer).
 */

import { createHash } from "node:crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestUser, createTestProduct, createTestSku } from "@/test/integration/factories";
import { OrderStatus, PaymentStatus, type Order } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

// Mock UploadThing pour éviter un upload réel vers le CDN. On simule un
// `ufsUrl` déterministe.
vi.mock("@/shared/lib/uploadthing", () => ({
	utapi: {
		uploadFiles: vi.fn(async (files: File[]) => [
			{
				data: {
					ufsUrl: `https://utfs.io/f/mock-${files[0]?.name ?? "x"}`,
					key: `mock-key-${Date.now()}`,
					name: files[0]?.name ?? "x",
					size: files[0]?.size ?? 0,
				},
				error: null,
			},
		]),
	},
}));

// Mock l'alerte admin pour éviter un email réel
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendAdminPdfArchiveFailedAlert: vi.fn(),
}));

import { archiveInvoicePdf } from "../archive-invoice-pdf.service";

async function createPaidOrder(
	prisma: ReturnType<typeof getIntegrationPrismaClient>,
	userId: string,
	skuId: string,
): Promise<Order> {
	return prisma.order.create({
		data: {
			userId,
			orderNumber: `SYN-ARCH-${Date.now()}`,
			customerEmail: "arch@test.local",
			customerName: "Archive Test",
			shippingFirstName: "Arc",
			shippingLastName: "Hive",
			shippingAddress1: "1 rue",
			shippingPostalCode: "75001",
			shippingCity: "Paris",
			shippingCountry: "FR",
			shippingPhone: "+33600000000",
			status: OrderStatus.PROCESSING,
			paymentStatus: PaymentStatus.PAID,
			paidAt: new Date(),
			stripePaymentIntentId: `pi_arch_${Date.now()}`,
			subtotal: 4999,
			total: 4999,
			currency: "EUR",
			paymentMethod: "CARD",
			invoiceNumber: `F-${new Date().getFullYear()}-${Date.now().toString().slice(-5).padStart(5, "0")}`,
			invoiceStatus: "GENERATED",
			invoiceGeneratedAt: new Date(),
			items: {
				create: [
					{
						skuId,
						quantity: 1,
						productTitle: "Archive Test",
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
}

describeIntegration("archiveInvoicePdf — hash verification (EINV-TEST-013)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	it("hash persisté = SHA-256(buffer) — vérification déterministe", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id);

		// Buffer test déterministe (4 bytes "PDF" header simulé)
		const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
		const expectedHash = createHash("sha256").update(pdfBuffer).digest("hex");

		const result = await archiveInvoicePdf(order.id, order.invoiceNumber!, pdfBuffer);

		expect(result).not.toBeNull();
		expect(result!.invoicePdfHash).toBe(expectedHash);
		expect(result!.invoicePdfHash).toMatch(/^[a-f0-9]{64}$/);

		// Vérification DB
		const persisted = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoicePdfUrl: true, invoicePdfHash: true, invoiceArchivedAt: true },
		});
		expect(persisted.invoicePdfHash).toBe(expectedHash);
		expect(persisted.invoicePdfUrl).toContain("utfs.io/f/mock-invoice-");
		expect(persisted.invoiceArchivedAt).not.toBeNull();
	});

	it("idempotence — 2e appel sur même order retourne le hash existant SANS ré-uploader", async () => {
		const { utapi } = await import("@/shared/lib/uploadthing");
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id);

		const pdfBuffer = new Uint8Array([1, 2, 3, 4]);

		// 1er appel : uploade
		const first = await archiveInvoicePdf(order.id, order.invoiceNumber!, pdfBuffer);
		const uploadCallsAfterFirst = (utapi.uploadFiles as ReturnType<typeof vi.fn>).mock.calls.length;

		// 2e appel : doit court-circuiter
		const second = await archiveInvoicePdf(order.id, order.invoiceNumber!, pdfBuffer);

		expect(second).toEqual(first);

		const uploadCallsAfterSecond = (utapi.uploadFiles as ReturnType<typeof vi.fn>).mock.calls
			.length;
		// Pas d'upload supplémentaire
		expect(uploadCallsAfterSecond).toBe(uploadCallsAfterFirst);
	});

	it("idempotence — 2e appel avec buffer DIFFÉRENT retourne le hash original (immuabilité Art. L102 B)", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id);

		const buf1 = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
		const hash1 = createHash("sha256").update(buf1).digest("hex");
		const buf2 = new Uint8Array([0xff, 0xee, 0xdd, 0xcc]); // buffer corrompu
		const hash2Theoretical = createHash("sha256").update(buf2).digest("hex");

		expect(hash1).not.toBe(hash2Theoretical);

		// 1er appel : pose hash1
		await archiveInvoicePdf(order.id, order.invoiceNumber!, buf1);

		// 2e appel : skip — le buffer différent N'ÉCRASE PAS le hash original
		// (garantie d'immuabilité de l'archive)
		const second = await archiveInvoicePdf(order.id, order.invoiceNumber!, buf2);
		expect(second?.invoicePdfHash).toBe(hash1);

		const persisted = await prisma.order.findUniqueOrThrow({
			where: { id: order.id },
			select: { invoicePdfHash: true },
		});
		expect(persisted.invoicePdfHash).toBe(hash1);
	});

	it("OrderHistory contient INVOICE_ARCHIVED après archivage réussi", async () => {
		const user = await createTestUser();
		const product = await createTestProduct();
		const sku = await createTestSku(product.id);
		const order = await createPaidOrder(prisma, user.id, sku.id);

		const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
		const expectedHash = createHash("sha256").update(pdfBuffer).digest("hex");

		await archiveInvoicePdf(order.id, order.invoiceNumber!, pdfBuffer);

		const history = await prisma.orderHistory.findFirst({
			where: { orderId: order.id, action: "INVOICE_ARCHIVED" },
		});

		expect(history).not.toBeNull();
		const meta = history!.metadata as { invoicePdfHash?: string; invoiceNumber?: string };
		expect(meta.invoicePdfHash).toBe(expectedHash);
		expect(meta.invoiceNumber).toBe(order.invoiceNumber);
	});
});
