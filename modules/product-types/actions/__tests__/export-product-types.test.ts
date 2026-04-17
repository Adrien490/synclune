import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockPrisma: {
		productType: {
			findMany: vi.fn(),
		},
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAdminWithUser: mockRequireAdmin }));
vi.mock("@/shared/lib/audit-log", () => ({ logAudit: mockLogAudit }));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_PRODUCT_TYPE_LIMITS: { EXPORT: "pt-export" },
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
}));

import { exportProductTypes } from "../export-product-types";

// ============================================================================
// HELPERS
// ============================================================================

const adminUser = { id: "admin-1", name: "Alice", email: "alice@test.com" };

function makeRow(overrides: Record<string, unknown> = {}) {
	return {
		label: "Bague",
		slug: "bague",
		description: "Bague artisanale",
		isActive: true,
		isSystem: false,
		createdAt: new Date("2026-01-15T10:00:00Z"),
		_count: { products: 12, customizationRequests: 3 },
		...overrides,
	};
}

const csvFormData = createMockFormData({ format: "csv" });
const jsonFormData = createMockFormData({ format: "json" });

// ============================================================================
// TESTS
// ============================================================================

describe("exportProductTypes", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdmin.mockResolvedValue({ user: adminUser });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockPrisma.productType.findMany.mockResolvedValue([
			makeRow({ label: "Bague", slug: "bague" }),
			makeRow({ label: "Collier", slug: "collier", description: null }),
		]);

		mockSuccess.mockImplementation((msg: string, data: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("should return auth error when not admin", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});
		const result = await exportProductTypes(undefined, csvFormData);
		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("should return rate limit error", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Rate limit" },
		});
		const result = await exportProductTypes(undefined, csvFormData);
		expect(result.status).toBe(ActionStatus.ERROR);
	});

	it("should return validation error for invalid format", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Format invalide" },
		});
		const result = await exportProductTypes(undefined, csvFormData);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
	});

	it("should produce a CSV payload with header + rows", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		const result = await exportProductTypes(undefined, csvFormData);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		const payload = result.data as { filename: string; mimeType: string; content: string };
		expect(payload.mimeType).toBe("text/csv;charset=utf-8");
		expect(payload.filename).toMatch(/^product-types-\d{4}-\d{2}-\d{2}\.csv$/);
		expect(payload.content).toContain(
			"label,slug,description,isActive,isSystem,productsCount,customizationsCount,createdAt",
		);
		expect(payload.content).toContain("Bague,bague,Bague artisanale,true,false,12,3,2026-01-15");
		// description null -> empty cell
		expect(payload.content).toContain("Collier,collier,,true,false,12,3,2026-01-15");
	});

	it("should quote CSV cells containing commas, quotes and newlines (RFC 4180)", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		mockPrisma.productType.findMany.mockResolvedValue([
			makeRow({
				label: 'Bague, "spéciale"',
				description: "Ligne 1\nLigne 2",
			}),
		]);
		const result = await exportProductTypes(undefined, csvFormData);
		const payload = result.data as { content: string };
		expect(payload.content).toContain('"Bague, ""spéciale"""');
		expect(payload.content).toContain('"Ligne 1\nLigne 2"');
	});

	it("should produce a JSON payload with productTypes array", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "json" } });
		const result = await exportProductTypes(undefined, jsonFormData);
		const payload = result.data as { filename: string; mimeType: string; content: string };
		expect(payload.mimeType).toBe("application/json;charset=utf-8");
		expect(payload.filename).toMatch(/^product-types-\d{4}-\d{2}-\d{2}\.json$/);
		const parsed = JSON.parse(payload.content) as {
			count: number;
			productTypes: Array<{ label: string; productsCount: number; customizationsCount: number }>;
		};
		expect(parsed.count).toBe(2);
		expect(parsed.productTypes).toHaveLength(2);
		expect(parsed.productTypes[0]!.productsCount).toBe(12);
		expect(parsed.productTypes[0]!.customizationsCount).toBe(3);
	});

	it("should query productTypes sorted alphabetically by label", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		await exportProductTypes(undefined, csvFormData);
		expect(mockPrisma.productType.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ orderBy: { label: "asc" } }),
		);
	});

	it("should emit audit log with action productType.export", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		await exportProductTypes(undefined, csvFormData);
		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				adminId: adminUser.id,
				action: "productType.export",
				targetType: "productType",
				targetId: "all",
				metadata: { format: "csv", count: 2 },
			}),
		);
	});

	it("should call handleActionError on unexpected exception", async () => {
		mockValidateInput.mockReturnValue({ data: { format: "csv" } });
		mockPrisma.productType.findMany.mockRejectedValue(new Error("DB crash"));
		const result = await exportProductTypes(undefined, csvFormData);
		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
