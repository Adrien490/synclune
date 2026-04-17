import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockNotFound,
} = vi.hoisted(() => ({
	mockPrisma: {
		discount: { findUnique: vi.fn() },
		discountUsage: { findMany: vi.fn() },
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	success: mockSuccess,
	error: mockError,
	notFound: mockNotFound,
}));

vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: vi.fn(),
}));

vi.mock("../../../schemas/discount.schemas", () => ({
	exportDiscountUsagesSchema: {},
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_DISCOUNT_LIMITS: { EXPORT_USAGES: "discount-export" },
}));

vi.mock("../../../constants/discount.constants", () => ({
	DISCOUNT_ERROR_MESSAGES: {
		NO_USAGES_TO_EXPORT: "Ce code promo n'a aucune utilisation à exporter",
		EXPORT_USAGES_FAILED: "Erreur lors de l'export des utilisations",
	},
}));

import { exportDiscountUsages } from "../export-discount-usages";

function createFormData(data: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(data)) fd.set(k, v);
	return fd;
}

const validFormData = createFormData({ id: "disc-123" });
const usageFixture = {
	createdAt: new Date("2026-04-15T08:30:00Z"),
	discountCode: "PROMO20",
	amountApplied: 1500,
	order: { orderNumber: "CMD-001", total: 12000 },
	user: { name: "Alice Dupont", email: "alice@example.com" },
};

describe("exportDiscountUsages", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin-1", email: "a@b.com" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({ data: { id: "disc-123" } });
		mockPrisma.discount.findUnique.mockResolvedValue({ id: "disc-123", code: "PROMO20" });

		mockSuccess.mockImplementation((message: string, data?: Record<string, unknown>) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockNotFound.mockImplementation((entity: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${entity} introuvable`,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when not admin", async () => {
		mockRequireAdmin.mockResolvedValue({
			error: { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" },
		});

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.UNAUTHORIZED);
	});

	it("returns rate limit error when rate limited", async () => {
		const rl = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rl });

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(result).toEqual(rl);
	});

	it("returns notFound when discount missing", async () => {
		mockPrisma.discount.findUnique.mockResolvedValue(null);

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.NOT_FOUND);
	});

	it("returns error when no usages exist", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([]);

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Ce code promo n'a aucune utilisation à exporter");
	});

	it("builds CSV with BOM, header, and rows", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([usageFixture]);

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		const csv = (result.data as { csv: string }).csv;
		expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
		expect(csv).toContain(
			"Date,Code,Numéro de commande,Total commande (€),Réduction appliquée (€),Client (nom),Client (email)",
		);
		expect(csv).toContain("PROMO20");
		expect(csv).toContain("CMD-001");
		expect(csv).toContain("120,00"); // 12000 cents → 120,00 €
		expect(csv).toContain("15,00"); // 1500 cents → 15,00 €
		expect(csv).toContain("alice@example.com");
		expect(csv).toContain("Alice Dupont");
	});

	it("escapes commas and quotes in CSV fields", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([
			{
				...usageFixture,
				user: { name: 'Doe, "John"', email: "j@x.com" },
			},
		]);

		const result = await exportDiscountUsages(undefined, validFormData);

		const csv = (result.data as { csv: string }).csv;
		expect(csv).toContain('"Doe, ""John"""');
	});

	it("handles guest checkout (null user)", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([{ ...usageFixture, user: null }]);

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		const csv = (result.data as { csv: string } | undefined)?.csv ?? "";
		// Last 2 fields (name, email) empty after the discount amount (which is quoted "15,00")
		expect(csv).toMatch(/"15,00",,$/m);
	});

	it("returns filename with discount code and date", async () => {
		mockPrisma.discountUsage.findMany.mockResolvedValue([usageFixture]);

		const result = await exportDiscountUsages(undefined, validFormData);

		const filename = (result.data as { filename: string }).filename;
		expect(filename).toMatch(/^discount-PROMO20-usages-\d{4}-\d{2}-\d{2}\.csv$/);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockPrisma.discountUsage.findMany.mockRejectedValue(new Error("DB"));

		const result = await exportDiscountUsages(undefined, validFormData);

		expect(mockHandleActionError).toHaveBeenCalled();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
