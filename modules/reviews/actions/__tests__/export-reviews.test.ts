import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData } from "@/test/factories";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockValidateInput,
	mockSuccess,
	mockHandleActionError,
	mockGetReviewsForExport,
	mockBuildReviewExport,
	mockLogAudit,
} = vi.hoisted(() => ({
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockGetReviewsForExport: vi.fn(),
	mockBuildReviewExport: vi.fn(),
	mockLogAudit: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_REVIEW_LIMITS: { EXPORT: "export" },
}));
vi.mock("@/shared/lib/audit-log", () => ({
	logAudit: mockLogAudit,
}));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	success: mockSuccess,
	handleActionError: mockHandleActionError,
}));
vi.mock("../../constants/review.constants", () => ({
	REVIEW_ERROR_MESSAGES: {
		EXPORT_FAILED: "Erreur export",
	},
}));
vi.mock("../../schemas/review.schemas", () => ({
	exportReviewsSchema: { _id: "exportSchema" },
}));
vi.mock("../../data/get-reviews-for-export", () => ({
	getReviewsForExport: mockGetReviewsForExport,
}));
vi.mock("../../services/review-export.service", () => ({
	buildReviewExport: mockBuildReviewExport,
}));

import { exportReviewsAction } from "../export-reviews";

// ============================================================================
// TESTS
// ============================================================================

describe("exportReviewsAction", () => {
	const formDataDefault = createMockFormData({
		period: "30d",
		format: "csv",
		includeHidden: "false",
		includeDeleted: "false",
	});

	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({
			user: { id: "admin-1", name: "Admin", email: "admin@test.fr" },
		});
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		mockValidateInput.mockReturnValue({
			data: { period: "30d", format: "csv", includeHidden: false, includeDeleted: false },
		});
		mockGetReviewsForExport.mockResolvedValue([{ id: "r1" }, { id: "r2" }, { id: "r3" }]);
		mockBuildReviewExport.mockReturnValue({
			filename: "avis-30d-2026-04-17.csv",
			mimeType: "text/csv;charset=utf-8",
			content: "ID\nr1\nr2\nr3",
			rowCount: 3,
		});
		mockLogAudit.mockResolvedValue(undefined);

		mockSuccess.mockImplementation((msg: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
			data,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	it("returns auth error when user is not admin", async () => {
		mockRequireAdminWithUser.mockResolvedValue({
			error: { status: ActionStatus.FORBIDDEN, message: "Admin requis" },
		});
		const result = await exportReviewsAction(undefined, formDataDefault);
		expect(result.status).toBe(ActionStatus.FORBIDDEN);
		expect(mockGetReviewsForExport).not.toHaveBeenCalled();
	});

	it("returns rate limit error when exceeded", async () => {
		mockEnforceRateLimit.mockResolvedValue({
			error: { status: ActionStatus.ERROR, message: "Limite" },
		});
		const result = await exportReviewsAction(undefined, formDataDefault);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mockGetReviewsForExport).not.toHaveBeenCalled();
	});

	it("uses EXPORT rate limit config", async () => {
		await exportReviewsAction(undefined, formDataDefault);
		expect(mockEnforceRateLimit).toHaveBeenCalledWith("export");
	});

	it("returns validation error when input invalid", async () => {
		mockValidateInput.mockReturnValue({
			error: { status: ActionStatus.VALIDATION_ERROR, message: "Bad period" },
		});
		const result = await exportReviewsAction(undefined, formDataDefault);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mockGetReviewsForExport).not.toHaveBeenCalled();
	});

	it("fetches reviews with validated period+flags", async () => {
		mockValidateInput.mockReturnValue({
			data: { period: "7d", format: "json", includeHidden: true, includeDeleted: false },
		});
		await exportReviewsAction(undefined, formDataDefault);
		expect(mockGetReviewsForExport).toHaveBeenCalledWith("7d", true, false);
	});

	it("builds export payload with period+format+rows", async () => {
		await exportReviewsAction(undefined, formDataDefault);
		expect(mockBuildReviewExport).toHaveBeenCalledWith("30d", "csv", [
			{ id: "r1" },
			{ id: "r2" },
			{ id: "r3" },
		]);
	});

	it("returns success with the export payload", async () => {
		const result = await exportReviewsAction(undefined, formDataDefault);
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(
			"Export généré",
			expect.objectContaining({
				filename: "avis-30d-2026-04-17.csv",
				mimeType: "text/csv;charset=utf-8",
				rowCount: 3,
			}),
		);
	});

	it("logs audit with export metadata", async () => {
		mockValidateInput.mockReturnValue({
			data: { period: "year", format: "json", includeHidden: true, includeDeleted: true },
		});
		await exportReviewsAction(undefined, formDataDefault);

		expect(mockLogAudit).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "review.export",
				targetType: "review",
				targetId: "bulk",
				metadata: expect.objectContaining({
					period: "year",
					format: "json",
					includeHidden: true,
					includeDeleted: true,
					rowCount: 3,
				}),
			}),
		);
	});

	it("calls handleActionError on unexpected exception", async () => {
		mockGetReviewsForExport.mockRejectedValue(new Error("DB crash"));
		const result = await exportReviewsAction(undefined, formDataDefault);
		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), "Erreur export");
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
