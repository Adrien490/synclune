import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @regression ereporting-defer-retry-2026-05-30
 *
 * EINV-EREPORT-009 — les wrappers `recordSales/RefundEReportingDeferrable` doivent
 * poser le flag DLQ (`Order/Refund.ereportingRetryDeferred`) UNIQUEMENT quand
 * l'enregistrement sous-jacent retourne `"error"`. `"skipped"` (feature flag OFF,
 * déjà enregistrée, hors B2C) ou un id (succès) ne doivent JAMAIS flaguer — sinon
 * la sémantique de go-live casse (toutes les ventes antérieures à l'activation,
 * qui renvoient "skipped", seraient flaguées à tort) et un enregistrement réussi
 * serait inutilement re-tenté par le cron. Une régression silencieuse ici =
 * sous/sur-déclaration DGFiP (Art. 286 CGI) jamais rattrapée OU bruit de cron.
 */

const { mockRecord, mockPrisma, mockLogger } = vi.hoisted(() => ({
	mockRecord: {
		recordSalesEReporting: vi.fn(),
		recordRefundEReporting: vi.fn(),
	},
	mockPrisma: {
		order: { update: vi.fn() },
		refund: { update: vi.fn() },
	},
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../record-ereporting.service", () => mockRecord);
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import {
	recordSalesEReportingDeferrable,
	recordRefundEReportingDeferrable,
} from "../defer-ereporting-retry.service";

beforeEach(() => {
	vi.clearAllMocks();
	mockPrisma.order.update.mockResolvedValue({});
	mockPrisma.refund.update.mockResolvedValue({});
});

afterEach(() => {
	vi.clearAllMocks();
});

describe("recordSalesEReportingDeferrable", () => {
	it("pose le flag Order.ereportingRetryDeferred quand l'enregistrement retourne 'error'", async () => {
		mockRecord.recordSalesEReporting.mockResolvedValue("error");

		await recordSalesEReportingDeferrable("order-1");

		expect(mockPrisma.order.update).toHaveBeenCalledWith({
			where: { id: "order-1" },
			data: { ereportingRetryDeferred: true },
		});
	});

	it("NE flague PAS quand l'enregistrement réussit (id retourné)", async () => {
		mockRecord.recordSalesEReporting.mockResolvedValue("etx-123");

		await recordSalesEReportingDeferrable("order-1");

		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("NE flague PAS quand l'enregistrement est 'skipped' (flag OFF / déjà enregistrée / hors B2C)", async () => {
		mockRecord.recordSalesEReporting.mockResolvedValue("skipped");

		await recordSalesEReportingDeferrable("order-1");

		expect(mockPrisma.order.update).not.toHaveBeenCalled();
	});

	it("ne throw jamais même si la pose du flag échoue (best-effort)", async () => {
		mockRecord.recordSalesEReporting.mockResolvedValue("error");
		mockPrisma.order.update.mockRejectedValue(new Error("DB down"));

		await expect(recordSalesEReportingDeferrable("order-1")).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalled();
	});
});

describe("recordRefundEReportingDeferrable", () => {
	it("pose le flag Refund.ereportingRetryDeferred quand l'enregistrement retourne 'error'", async () => {
		mockRecord.recordRefundEReporting.mockResolvedValue("error");

		await recordRefundEReportingDeferrable("refund-1");

		expect(mockPrisma.refund.update).toHaveBeenCalledWith({
			where: { id: "refund-1" },
			data: { ereportingRetryDeferred: true },
		});
	});

	it("NE flague PAS quand l'enregistrement réussit ou est 'skipped'", async () => {
		mockRecord.recordRefundEReporting.mockResolvedValue("etx-456");
		await recordRefundEReportingDeferrable("refund-1");
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();

		mockRecord.recordRefundEReporting.mockResolvedValue("skipped");
		await recordRefundEReportingDeferrable("refund-2");
		expect(mockPrisma.refund.update).not.toHaveBeenCalled();
	});
});
