import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoist mocks so they are available before module resolution
const { mockAuditLogCreate, mockLoggerError } = vi.hoisted(() => ({
	mockAuditLogCreate: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		auditLog: {
			create: mockAuditLogCreate,
		},
	},
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: {
		error: mockLoggerError,
	},
}));

import { logAudit, logAuditTx } from "../audit-log";

// Minimal audit log params used across multiple tests
const baseParams = {
	adminId: "admin-1",
	adminName: "Alice Admin",
	action: "UPDATE_PRODUCT",
	targetType: "Product",
	targetId: "prod-42",
};

beforeEach(() => {
	vi.clearAllMocks();
	mockAuditLogCreate.mockResolvedValue(undefined);
});

// ============================================================================
// logAudit
// ============================================================================

describe("logAudit", () => {
	it("calls prisma.auditLog.create with the correct data fields", async () => {
		await logAudit(baseParams);

		expect(mockAuditLogCreate).toHaveBeenCalledOnce();
		expect(mockAuditLogCreate).toHaveBeenCalledWith({
			data: {
				adminId: "admin-1",
				adminName: "Alice Admin",
				action: "UPDATE_PRODUCT",
				targetType: "Product",
				targetId: "prod-42",
				metadata: undefined,
			},
		});
	});

	it("passes metadata when provided", async () => {
		const metadata = { previousStatus: "DRAFT", newStatus: "PUBLISHED" };

		await logAudit({ ...baseParams, metadata });

		expect(mockAuditLogCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({ metadata }),
		});
	});

	it("passes nested metadata objects without modification", async () => {
		const metadata = { items: [{ id: "sku-1", qty: 3 }], reason: "manual correction" };

		await logAudit({ ...baseParams, metadata });

		const call = mockAuditLogCreate.mock.calls[0] as [{ data: { metadata: unknown } }] | undefined;
		expect(call).toBeDefined();
		expect(call![0].data.metadata).toEqual(metadata);
	});

	it("catches a prisma error and logs it via logger.error without re-throwing", async () => {
		const dbError = new Error("DB connection lost");
		mockAuditLogCreate.mockRejectedValueOnce(dbError);

		// Must not throw — fire-and-forget contract
		await expect(logAudit(baseParams)).resolves.toBeUndefined();

		expect(mockLoggerError).toHaveBeenCalledOnce();
		expect(mockLoggerError).toHaveBeenCalledWith("Failed to write audit log", dbError, {
			service: "audit",
		});
	});

	it("does not call logger.error on success", async () => {
		await logAudit(baseParams);
		expect(mockLoggerError).not.toHaveBeenCalled();
	});

	it("resolves to undefined on success", async () => {
		const result = await logAudit(baseParams);
		expect(result).toBeUndefined();
	});
});

// ============================================================================
// logAuditTx
// ============================================================================

describe("logAuditTx", () => {
	// Build a minimal transaction client mock for each test
	const buildTxMock = () => ({
		auditLog: {
			create: vi.fn().mockResolvedValue(undefined),
		},
	});

	it("calls tx.auditLog.create (not prisma.auditLog.create) with the correct data", async () => {
		const tx = buildTxMock();

		// Cast to satisfy the Prisma.TransactionClient type without importing Prisma internals
		await logAuditTx(tx as never, baseParams);

		expect(tx.auditLog.create).toHaveBeenCalledOnce();
		expect(tx.auditLog.create).toHaveBeenCalledWith({
			data: {
				adminId: "admin-1",
				adminName: "Alice Admin",
				action: "UPDATE_PRODUCT",
				targetType: "Product",
				targetId: "prod-42",
				metadata: undefined,
			},
		});
		// Global prisma mock must not be touched
		expect(mockAuditLogCreate).not.toHaveBeenCalled();
	});

	it("passes metadata through the transaction client", async () => {
		const tx = buildTxMock();
		const metadata = { refundId: "ref-99", amount: 4999 };

		await logAuditTx(tx as never, { ...baseParams, metadata });

		expect(tx.auditLog.create).toHaveBeenCalledWith({
			data: expect.objectContaining({ metadata }),
		});
	});

	it("propagates errors from the transaction client (no catch)", async () => {
		const tx = buildTxMock();
		const txError = new Error("Transaction rolled back");
		tx.auditLog.create.mockRejectedValueOnce(txError);

		// Unlike logAudit, logAuditTx does NOT catch errors — caller owns the tx
		await expect(logAuditTx(tx as never, baseParams)).rejects.toThrow("Transaction rolled back");
	});

	it("resolves to undefined on success", async () => {
		const tx = buildTxMock();
		const result = await logAuditTx(tx as never, baseParams);
		expect(result).toBeUndefined();
	});
});
