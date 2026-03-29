import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

// server-only is already aliased in vitest.config.ts, no extra mock needed.
// Mock shared/lib/actions helpers to control validation and response creation.
const { mockValidateInput, mockSuccess, mockHandleActionError } = vi.hoisted(() => ({
	mockValidateInput: vi.fn(),
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/shared/lib/actions", () => ({
	validateInput: mockValidateInput,
	success: mockSuccess,
	handleActionError: mockHandleActionError,
}));

// Mock updateInstallPrompt to isolate setInstallPrompt from cookie logic.
const { mockUpdateInstallPrompt } = vi.hoisted(() => ({
	mockUpdateInstallPrompt: vi.fn(),
}));

vi.mock("../update-install-prompt", () => ({
	updateInstallPrompt: mockUpdateInstallPrompt,
}));

// ============================================================================
// Import under test (after mocks)
// ============================================================================

import { setInstallPrompt } from "../set-install-prompt";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Helpers
// ============================================================================

function makeFormData(action?: string): FormData {
	const fd = new FormData();
	if (action !== undefined) {
		fd.append("action", action);
	}
	return fd;
}

const VALIDATION_ERROR_STATE = {
	status: ActionStatus.VALIDATION_ERROR,
	message: "Action invalide",
} as const;

const SUCCESS_STATE = {
	status: ActionStatus.SUCCESS,
	message: "OK",
	data: { visitCount: 1, dismissCount: 0, permanentlyDismissed: false },
} as const;

const ERROR_STATE = {
	status: ActionStatus.ERROR,
	message: "Erreur install prompt",
} as const;

// ============================================================================
// Tests
// ============================================================================

describe("setInstallPrompt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// --------------------------------------------------------------------------
	// Validation failure
	// --------------------------------------------------------------------------

	it("returns validation error when validateInput fails", async () => {
		mockValidateInput.mockReturnValue({ error: VALIDATION_ERROR_STATE });

		const result = await setInstallPrompt(undefined, makeFormData("invalid"));

		expect(result).toBe(VALIDATION_ERROR_STATE);
		expect(mockUpdateInstallPrompt).not.toHaveBeenCalled();
	});

	// --------------------------------------------------------------------------
	// Success path
	// --------------------------------------------------------------------------

	it("calls updateInstallPrompt with validated data on success", async () => {
		const validatedData = { action: "visit" as const };
		mockValidateInput.mockReturnValue({ data: validatedData });
		mockUpdateInstallPrompt.mockResolvedValue({
			visitCount: 1,
			dismissCount: 0,
			permanentlyDismissed: false,
		});
		mockSuccess.mockReturnValue(SUCCESS_STATE);

		await setInstallPrompt(undefined, makeFormData("visit"));

		expect(mockUpdateInstallPrompt).toHaveBeenCalledOnce();
		expect(mockUpdateInstallPrompt).toHaveBeenCalledWith(validatedData);
	});

	it("returns success with result data when updateInstallPrompt resolves", async () => {
		const updateResult = { visitCount: 2, dismissCount: 0, permanentlyDismissed: false };
		mockValidateInput.mockReturnValue({ data: { action: "visit" as const } });
		mockUpdateInstallPrompt.mockResolvedValue(updateResult);
		mockSuccess.mockReturnValue(SUCCESS_STATE);

		const result = await setInstallPrompt(undefined, makeFormData("visit"));

		expect(mockSuccess).toHaveBeenCalledWith("OK", updateResult);
		expect(result).toBe(SUCCESS_STATE);
	});

	// --------------------------------------------------------------------------
	// Error path
	// --------------------------------------------------------------------------

	it("returns handleActionError result when updateInstallPrompt throws", async () => {
		const thrownError = new Error("Cookie write failed");
		mockValidateInput.mockReturnValue({ data: { action: "dismiss" as const } });
		mockUpdateInstallPrompt.mockRejectedValue(thrownError);
		mockHandleActionError.mockReturnValue(ERROR_STATE);

		const result = await setInstallPrompt(undefined, makeFormData("dismiss"));

		expect(mockHandleActionError).toHaveBeenCalledWith(thrownError, "Erreur install prompt");
		expect(result).toBe(ERROR_STATE);
	});
});
