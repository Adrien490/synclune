import { describe, expect, it, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: {
			findUnique: vi.fn(),
			update: vi.fn(),
		},
	},
}));

vi.mock("@/shared/lib/uploadthing", () => ({
	utapi: { uploadFiles: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const { storeInvoiceXmlArtifact } = await import("../store-invoice-artifact");
const { prisma } = await import("@/shared/lib/prisma");
const { utapi } = await import("@/shared/lib/uploadthing");
const { logger } = await import("@/shared/lib/logger");

const XML_SAMPLE = '<?xml version="1.0" encoding="UTF-8"?>\n<Invoice/>\n';
const XML_HASH = createHash("sha256").update(new TextEncoder().encode(XML_SAMPLE)).digest("hex");

describe("storeInvoiceXmlArtifact", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uploads and persists when no archive exists", async () => {
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: null,
			invoiceXmlHash: null,
			invoiceXmlFormat: null,
		} as never);
		vi.mocked(utapi.uploadFiles).mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.test/xml1.xml" } as never },
		] as never);
		vi.mocked(prisma.order.update).mockResolvedValue({} as never);

		const result = await storeInvoiceXmlArtifact(
			"order-1",
			"F-2026-00001",
			XML_SAMPLE,
			"FACTURX_MINIMUM",
		);

		expect(result).not.toBeNull();
		expect(result!.invoiceXmlUrl).toBe("https://utfs.test/xml1.xml");
		expect(result!.invoiceXmlHash).toBe(XML_HASH);
		expect(result!.invoiceXmlFormat).toBe("FACTURX_MINIMUM");
		expect(result!.reused).toBe(false);
		expect(prisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: expect.objectContaining({
				invoiceXmlUrl: "https://utfs.test/xml1.xml",
				invoiceXmlHash: XML_HASH,
				invoiceXmlFormat: "FACTURX_MINIMUM",
			}),
		});
	});

	it("returns existing artifact when hash matches (idempotent)", async () => {
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: "https://utfs.test/already.xml",
			invoiceXmlHash: XML_HASH,
			invoiceXmlFormat: "FACTURX_MINIMUM",
		} as never);

		const result = await storeInvoiceXmlArtifact(
			"order-1",
			"F-2026-00001",
			XML_SAMPLE,
			"FACTURX_MINIMUM",
		);

		expect(result).not.toBeNull();
		expect(result!.reused).toBe(true);
		expect(result!.invoiceXmlUrl).toBe("https://utfs.test/already.xml");
		expect(utapi.uploadFiles).not.toHaveBeenCalled();
		expect(prisma.order.update).not.toHaveBeenCalled();
	});

	it("preserves existing archive when hash drifts (warn, no overwrite)", async () => {
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: "https://utfs.test/original.xml",
			invoiceXmlHash: "a".repeat(64),
			invoiceXmlFormat: "FACTURX_MINIMUM",
		} as never);

		const result = await storeInvoiceXmlArtifact(
			"order-1",
			"F-2026-00001",
			XML_SAMPLE,
			"FACTURX_MINIMUM",
		);

		expect(result).not.toBeNull();
		expect(result!.reused).toBe(true);
		expect(result!.invoiceXmlUrl).toBe("https://utfs.test/original.xml");
		expect(result!.invoiceXmlHash).toBe("a".repeat(64));
		expect(utapi.uploadFiles).not.toHaveBeenCalled();
		expect(prisma.order.update).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalled();
	});

	it("returns null when UploadThing fails (best-effort)", async () => {
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: null,
			invoiceXmlHash: null,
			invoiceXmlFormat: null,
		} as never);
		vi.mocked(utapi.uploadFiles).mockResolvedValue([
			{ data: null, error: { message: "upstream 503" } } as never,
		] as never);

		const result = await storeInvoiceXmlArtifact(
			"order-1",
			"F-2026-00001",
			XML_SAMPLE,
			"FACTURX_MINIMUM",
		);

		expect(result).toBeNull();
		expect(prisma.order.update).not.toHaveBeenCalled();
		expect(logger.error).toHaveBeenCalled();
	});

	it("uses UBL extension for UBL formats", async () => {
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: null,
			invoiceXmlHash: null,
			invoiceXmlFormat: null,
		} as never);
		const uploadSpy = vi
			.mocked(utapi.uploadFiles)
			.mockResolvedValue([{ data: { ufsUrl: "https://utfs.test/ubl.xml" } as never }] as never);
		vi.mocked(prisma.order.update).mockResolvedValue({} as never);

		await storeInvoiceXmlArtifact("order-2", "F-2026-00002", XML_SAMPLE, "UBL_INVOICE");

		const uploadedFile = uploadSpy.mock.calls[0]![0] as File[];
		expect(uploadedFile[0]!.name).toBe("invoice-F-2026-00002.ubl.xml");
	});

	it("hash is deterministic and stable across calls", async () => {
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: null,
			invoiceXmlHash: null,
			invoiceXmlFormat: null,
		} as never);
		vi.mocked(utapi.uploadFiles).mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.test/x.xml" } as never },
		] as never);
		vi.mocked(prisma.order.update).mockResolvedValue({} as never);

		const r1 = await storeInvoiceXmlArtifact(
			"order-3",
			"F-2026-00003",
			XML_SAMPLE,
			"FACTURX_MINIMUM",
		);

		vi.clearAllMocks();
		vi.mocked(prisma.order.findUnique).mockResolvedValue({
			invoiceXmlUrl: null,
			invoiceXmlHash: null,
			invoiceXmlFormat: null,
		} as never);
		vi.mocked(utapi.uploadFiles).mockResolvedValue([
			{ data: { ufsUrl: "https://utfs.test/x.xml" } as never },
		] as never);
		vi.mocked(prisma.order.update).mockResolvedValue({} as never);

		const r2 = await storeInvoiceXmlArtifact(
			"order-3",
			"F-2026-00003",
			XML_SAMPLE,
			"FACTURX_MINIMUM",
		);

		expect(r1!.invoiceXmlHash).toBe(r2!.invoiceXmlHash);
	});
});
