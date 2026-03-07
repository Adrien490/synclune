import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const {
	mockPrisma,
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockSuccess,
	mockError,
	mockSanitizeForEmail,
	mockSendCustomizationStatusEmail,
	mockCanTransitionTo,
	mockGetCustomizationInvalidationTags,
} = vi.hoisted(() => ({
	mockPrisma: {
		customizationRequest: {
			findMany: vi.fn(),
			updateMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockSanitizeForEmail: vi.fn(),
	mockSendCustomizationStatusEmail: vi.fn(),
	mockCanTransitionTo: vi.fn(),
	mockGetCustomizationInvalidationTags: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: mockPrisma,
	notDeleted: { deletedAt: null },
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdmin,
}));

vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("@/shared/lib/rate-limit-config", () => ({
	ADMIN_CUSTOMIZATION_LIMITS: { BULK_UPDATE: "admin-customization-bulk-update" },
}));

vi.mock("next/cache", () => ({
	updateTag: mockUpdateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
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
}));

vi.mock("@/shared/lib/sanitize", () => ({
	sanitizeForEmail: mockSanitizeForEmail,
}));

vi.mock("@/modules/emails/services/customization-emails", () => ({
	sendCustomizationStatusEmail: mockSendCustomizationStatusEmail,
}));

vi.mock("../../services/customization-status.service", () => ({
	canTransitionTo: mockCanTransitionTo,
	isFirstResponse: (current: string, target: string) =>
		current === "PENDING" && target !== "PENDING",
}));

vi.mock("../../constants/cache", () => ({
	getCustomizationInvalidationTags: mockGetCustomizationInvalidationTags,
	CUSTOMIZATION_CACHE_TAGS: {
		LIST: "customization-requests-list",
		STATS: "customization-requests-stats",
		DETAIL: (id: string) => `customization-request-${id}`,
		USER_REQUESTS: (userId: string) => `customization-requests-user-${userId}`,
	},
}));

vi.mock("../../schemas/bulk-update-status.schema", () => ({
	bulkUpdateStatusSchema: {},
}));

vi.mock("@/app/generated/prisma/client", () => ({
	CustomizationRequestStatus: {
		PENDING: "PENDING",
		IN_PROGRESS: "IN_PROGRESS",
		COMPLETED: "COMPLETED",
		CANCELLED: "CANCELLED",
	},
}));

import { bulkUpdateCustomizationStatus } from "../bulk-update-customization-status";

// ============================================================================
// HELPERS
// ============================================================================

function createFormData(entries: { requestIds?: string[]; status?: string } = {}): FormData {
	const formData = new FormData();
	const ids = entries.requestIds ?? ["cm1234567890abcdefghijklm", "cm9876543210zyxwvutsrqpon"];
	for (const id of ids) {
		formData.append("requestIds", id);
	}
	if (entries.status !== undefined) {
		formData.set("status", entries.status);
	} else {
		formData.set("status", "IN_PROGRESS");
	}
	return formData;
}

const MOCK_PENDING_REQUEST_1 = {
	id: "cm1234567890abcdefghijklm",
	userId: "user_001",
	status: "PENDING",
	email: "marie@example.com",
	firstName: "Marie",
	productTypeLabel: "Bague",
	details: "Détails de la demande 1",
	adminNotes: null,
};

const MOCK_PENDING_REQUEST_2 = {
	id: "cm9876543210zyxwvutsrqpon",
	userId: "user_002",
	status: "PENDING",
	email: "sophie@example.com",
	firstName: "Sophie",
	productTypeLabel: "Collier",
	details: "Détails de la demande 2",
	adminNotes: "Quelques notes",
};

// ============================================================================
// TESTS
// ============================================================================

describe("bulkUpdateCustomizationStatus", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		// Default: admin authenticated
		mockRequireAdmin.mockResolvedValue({ user: { id: "admin_abc" } });

		// Default: rate limit passes
		mockEnforceRateLimit.mockResolvedValue({ success: true });

		// Default: validation passes
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id, MOCK_PENDING_REQUEST_2.id],
				status: "IN_PROGRESS",
			},
		});

		// Default: both requests exist
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ ...MOCK_PENDING_REQUEST_1 },
			{ ...MOCK_PENDING_REQUEST_2 },
		]);

		// Default: all transitions are valid
		mockCanTransitionTo.mockReturnValue(true);

		// Default: transaction runs the operations in series
		mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));

		// Default: updateMany succeeds
		mockPrisma.customizationRequest.updateMany.mockResolvedValue({ count: 2 });

		// Default: sanitize passes through
		mockSanitizeForEmail.mockImplementation((str: string) => str);

		// Default: email sends successfully (fire-and-forget)
		mockSendCustomizationStatusEmail.mockResolvedValue({ success: true });

		// Default: cache tags
		mockGetCustomizationInvalidationTags.mockReturnValue([
			"customization-requests-list",
			"customization-requests-stats",
			"admin-badges",
		]);

		// Default: response helpers
		mockSuccess.mockImplementation((message: string, data?: unknown) => ({
			status: ActionStatus.SUCCESS,
			message,
			data,
		}));
		mockError.mockImplementation((message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));
	});

	// ──────────────────────────────────────────────────────────────
	// Auth
	// ──────────────────────────────────────────────────────────────

	it("should return auth error when not admin", async () => {
		const authError = { status: ActionStatus.UNAUTHORIZED, message: "Non autorisé" };
		mockRequireAdmin.mockResolvedValue({ error: authError });

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result).toEqual(authError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Rate limit
	// ──────────────────────────────────────────────────────────────

	it("should return rate limit error when rate limited", async () => {
		const rateLimitError = { status: ActionStatus.ERROR, message: "Trop de requêtes" };
		mockEnforceRateLimit.mockResolvedValue({ error: rateLimitError });

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result).toEqual(rateLimitError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Validation
	// ──────────────────────────────────────────────────────────────

	it("should return validation error for invalid input", async () => {
		const validationError = {
			status: ActionStatus.VALIDATION_ERROR,
			message: "Au moins une demande requise",
		};
		mockValidateInput.mockReturnValue({ error: validationError });

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result).toEqual(validationError);
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Not found
	// ──────────────────────────────────────────────────────────────

	it("should return error when no requests are found", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([]);

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune demande");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Transition filtering
	// ──────────────────────────────────────────────────────────────

	it("should return error when all requests have invalid transitions", async () => {
		mockCanTransitionTo.mockReturnValue(false);

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("Aucune transition");
		expect(mockPrisma.$transaction).not.toHaveBeenCalled();
	});

	it("should only update requests with valid transitions (partial batch)", async () => {
		// Only the first request has a valid transition
		mockCanTransitionTo.mockReturnValueOnce(true).mockReturnValueOnce(false);

		await bulkUpdateCustomizationStatus(undefined, createFormData());

		// Transaction should be called with operations for just the 1 valid request
		expect(mockPrisma.$transaction).toHaveBeenCalled();
		expect(mockPrisma.customizationRequest.updateMany).toHaveBeenCalledTimes(1);
	});

	// ──────────────────────────────────────────────────────────────
	// respondedAt — atomic bulk update
	// ──────────────────────────────────────────────────────────────

	it("should set respondedAt for PENDING → non-PENDING transitions", async () => {
		// Both requests are PENDING, transitioning to IN_PROGRESS
		await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(mockPrisma.customizationRequest.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: {
						in: [MOCK_PENDING_REQUEST_1.id, MOCK_PENDING_REQUEST_2.id],
					},
				},
				data: expect.objectContaining({
					status: "IN_PROGRESS",
					respondedAt: expect.any(Date),
				}),
			}),
		);
	});

	it("should NOT set respondedAt when transitioning from non-PENDING status", async () => {
		// Both requests are already IN_PROGRESS
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ ...MOCK_PENDING_REQUEST_1, status: "IN_PROGRESS" },
			{ ...MOCK_PENDING_REQUEST_2, status: "IN_PROGRESS" },
		]);
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id, MOCK_PENDING_REQUEST_2.id],
				status: "COMPLETED",
			},
		});

		await bulkUpdateCustomizationStatus(undefined, createFormData({ status: "COMPLETED" }));

		expect(mockPrisma.customizationRequest.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "COMPLETED" }),
			}),
		);
		const updateCall = mockPrisma.customizationRequest.updateMany.mock.calls[0]![0];
		expect(updateCall.data).not.toHaveProperty("respondedAt");
	});

	it("should split PENDING and non-PENDING requests into separate updateMany calls", async () => {
		// Mix: one PENDING, one IN_PROGRESS
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ ...MOCK_PENDING_REQUEST_1, status: "PENDING" },
			{ ...MOCK_PENDING_REQUEST_2, status: "IN_PROGRESS" },
		]);
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id, MOCK_PENDING_REQUEST_2.id],
				status: "COMPLETED",
			},
		});

		await bulkUpdateCustomizationStatus(undefined, createFormData({ status: "COMPLETED" }));

		// Two separate updateMany calls: one with respondedAt, one without
		expect(mockPrisma.customizationRequest.updateMany).toHaveBeenCalledTimes(2);
		const calls = mockPrisma.customizationRequest.updateMany.mock.calls;
		const withRespondedAt = calls.find((args: unknown[]) => {
			const [arg] = args as [{ data: Record<string, unknown> }];
			return arg.data.respondedAt !== undefined;
		});
		const withoutRespondedAt = calls.find((args: unknown[]) => {
			const [arg] = args as [{ data: Record<string, unknown> }];
			return arg.data.respondedAt === undefined;
		});
		expect(withRespondedAt).toBeDefined();
		expect(withoutRespondedAt).toBeDefined();
	});

	// ──────────────────────────────────────────────────────────────
	// Cache invalidation
	// ──────────────────────────────────────────────────────────────

	it("should invalidate list, stats, and per-request detail tags", async () => {
		await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-list");
		expect(mockUpdateTag).toHaveBeenCalledWith("customization-requests-stats");
		expect(mockUpdateTag).toHaveBeenCalledWith(
			`customization-request-${MOCK_PENDING_REQUEST_1.id}`,
		);
		expect(mockUpdateTag).toHaveBeenCalledWith(
			`customization-request-${MOCK_PENDING_REQUEST_2.id}`,
		);
	});

	it("should invalidate unique user cache tags for each affected user", async () => {
		await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(mockUpdateTag).toHaveBeenCalledWith(
			`customization-requests-user-${MOCK_PENDING_REQUEST_1.userId}`,
		);
		expect(mockUpdateTag).toHaveBeenCalledWith(
			`customization-requests-user-${MOCK_PENDING_REQUEST_2.userId}`,
		);
	});

	it("should deduplicate user cache tags when multiple requests share the same userId", async () => {
		// Both requests belong to the same user
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ ...MOCK_PENDING_REQUEST_1, userId: "user_shared" },
			{ ...MOCK_PENDING_REQUEST_2, userId: "user_shared" },
		]);

		await bulkUpdateCustomizationStatus(undefined, createFormData());

		const userTagCalls = mockUpdateTag.mock.calls
			.map((args: unknown[]) => {
				const [tag] = args as [string];
				return tag;
			})
			.filter((tag: string) => tag.startsWith("customization-requests-user-"));
		expect(userTagCalls).toHaveLength(1);
		expect(userTagCalls[0]).toBe("customization-requests-user-user_shared");
	});

	// ──────────────────────────────────────────────────────────────
	// Email sending
	// ──────────────────────────────────────────────────────────────

	it("should send status emails for IN_PROGRESS status to all updated requests", async () => {
		await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledTimes(2);
	});

	it("should send status emails for COMPLETED status", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ ...MOCK_PENDING_REQUEST_1, status: "IN_PROGRESS" },
		]);
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id],
				status: "COMPLETED",
			},
		});

		await bulkUpdateCustomizationStatus(undefined, createFormData({ status: "COMPLETED" }));

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({ status: "COMPLETED" }),
		);
	});

	it("should send status emails for CANCELLED status", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([{ ...MOCK_PENDING_REQUEST_1 }]);
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id],
				status: "CANCELLED",
			},
		});

		await bulkUpdateCustomizationStatus(undefined, createFormData({ status: "CANCELLED" }));

		expect(mockSendCustomizationStatusEmail).toHaveBeenCalledWith(
			expect.objectContaining({ status: "CANCELLED" }),
		);
	});

	it("should NOT send emails for PENDING status", async () => {
		// Edge: transitioning back to PENDING (canTransitionTo would normally block this,
		// but we want to verify the email guard independently)
		mockPrisma.customizationRequest.findMany.mockResolvedValue([
			{ ...MOCK_PENDING_REQUEST_1, status: "CANCELLED" },
		]);
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id],
				status: "PENDING",
			},
		});

		await bulkUpdateCustomizationStatus(undefined, createFormData({ status: "PENDING" }));

		expect(mockSendCustomizationStatusEmail).not.toHaveBeenCalled();
	});

	// ──────────────────────────────────────────────────────────────
	// Success response
	// ──────────────────────────────────────────────────────────────

	it("should return success with count of updated requests", async () => {
		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("2"), { count: 2 });
	});

	it("should return singular form when only 1 request is updated", async () => {
		mockPrisma.customizationRequest.findMany.mockResolvedValue([{ ...MOCK_PENDING_REQUEST_1 }]);
		mockValidateInput.mockReturnValue({
			data: {
				requestIds: [MOCK_PENDING_REQUEST_1.id],
				status: "IN_PROGRESS",
			},
		});

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mockSuccess).toHaveBeenCalledWith(expect.stringContaining("1"), { count: 1 });
	});

	// ──────────────────────────────────────────────────────────────
	// Error handling
	// ──────────────────────────────────────────────────────────────

	it("should call handleActionError when $transaction throws", async () => {
		mockPrisma.$transaction.mockRejectedValue(new Error("DB connection failed"));

		const result = await bulkUpdateCustomizationStatus(undefined, createFormData());

		expect(mockHandleActionError).toHaveBeenCalledWith(expect.any(Error), expect.any(String));
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
