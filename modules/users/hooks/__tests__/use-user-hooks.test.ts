import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockDeleteUser,
	mockCancelAccountDeletion,
	mockExportUserData,
	mockExportUserDataAdmin,
	mockInvalidateUserSessions,
	mockRestoreUser,
	mockSendPasswordResetAdmin,
	mockSuspendUser,
	mockUpdateProfile,
	mockChangeUserRole,
	mockRequestEmailChange,
	mockDeleteAccount,
	mockRefreshUsers,
	mockDownloadJSON,
	mockRouterPush,
	mockRouterRefresh,
} = vi.hoisted(() => ({
	mockDeleteUser: vi.fn(),
	mockCancelAccountDeletion: vi.fn(),
	mockExportUserData: vi.fn(),
	mockExportUserDataAdmin: vi.fn(),
	mockInvalidateUserSessions: vi.fn(),
	mockRestoreUser: vi.fn(),
	mockSendPasswordResetAdmin: vi.fn(),
	mockSuspendUser: vi.fn(),
	mockUpdateProfile: vi.fn(),
	mockChangeUserRole: vi.fn(),
	mockRequestEmailChange: vi.fn(),
	mockDeleteAccount: vi.fn(),
	mockRefreshUsers: vi.fn(),
	mockDownloadJSON: vi.fn(),
	mockRouterPush: vi.fn(),
	mockRouterRefresh: vi.fn(),
}));

vi.mock("@/modules/users/actions/admin/delete-user", () => ({
	deleteUser: mockDeleteUser,
}));
vi.mock("@/modules/users/actions/cancel-account-deletion", () => ({
	cancelAccountDeletion: mockCancelAccountDeletion,
}));
vi.mock("@/modules/users/actions/export-user-data", () => ({
	exportUserData: mockExportUserData,
}));
vi.mock("@/modules/users/actions/admin/export-user-data-admin", () => ({
	exportUserDataAdmin: mockExportUserDataAdmin,
}));
vi.mock("@/modules/users/actions/admin/invalidate-user-sessions", () => ({
	invalidateUserSessions: mockInvalidateUserSessions,
}));
vi.mock("@/modules/users/actions/admin/restore-user", () => ({
	restoreUser: mockRestoreUser,
}));
vi.mock("@/modules/users/actions/admin/send-password-reset-admin", () => ({
	sendPasswordResetAdmin: mockSendPasswordResetAdmin,
}));
vi.mock("@/modules/users/actions/admin/suspend-user", () => ({
	suspendUser: mockSuspendUser,
}));
vi.mock("@/modules/users/actions/update-profile", () => ({
	updateProfile: mockUpdateProfile,
}));
vi.mock("@/modules/users/actions/admin/change-user-role", () => ({
	changeUserRole: mockChangeUserRole,
}));
vi.mock("@/modules/users/actions/request-email-change", () => ({
	requestEmailChange: mockRequestEmailChange,
}));
vi.mock("@/modules/users/actions/delete-account", () => ({
	deleteAccount: mockDeleteAccount,
}));
vi.mock("@/modules/users/actions/refresh-users", () => ({
	refreshUsers: mockRefreshUsers,
}));

vi.mock("@/shared/utils/file-download", () => ({
	downloadJSON: mockDownloadJSON,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		refresh: mockRouterRefresh,
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useDeleteUser } from "../use-delete-user";
import { useCancelAccountDeletion } from "../use-cancel-account-deletion";
import { useExportUserData } from "../use-export-user-data";
import { useExportUserDataAdmin } from "../use-export-user-data-admin";
import { useInvalidateUserSessions } from "../use-invalidate-user-sessions";
import { useRestoreUser } from "../use-restore-user";
import { useSendPasswordResetAdmin } from "../use-send-password-reset-admin";
import { useSuspendUser } from "../use-suspend-user";
import { useUpdateProfile } from "../use-update-profile";
import { useChangeUserRole } from "../use-change-user-role";
import { useRequestEmailChange } from "../use-request-email-change";
import { useDeleteAccount } from "../use-delete-account";
import { useRefreshUsers } from "../use-refresh-users";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Failed" };

// ============================================================================
// useDeleteUser
// ============================================================================

describe("useDeleteUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteUser.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useDeleteUser());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("handle appends id to FormData", async () => {
		const { result } = renderHook(() => useDeleteUser());

		await act(async () => {
			result.current.handle("user-123");
		});

		const formData = mockDeleteUser.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("user-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteUser({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("OK");
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteUser.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteUser({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useCancelAccountDeletion
// ============================================================================

describe("useCancelAccountDeletion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCancelAccountDeletion.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useCancelAccountDeletion());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls the cancelAccountDeletion action when form is submitted", async () => {
		const { result } = renderHook(() => useCancelAccountDeletion());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockCancelAccountDeletion).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useExportUserData
// ============================================================================

describe("useExportUserData", () => {
	const exportPayload = { orders: [], profile: { name: "Alice" } };

	beforeEach(() => {
		vi.clearAllMocks();
		mockExportUserData.mockResolvedValue({
			status: "success" as const,
			message: "Export réussi",
			data: exportPayload,
		});
	});

	it("returns exportData and isPending", () => {
		const { result } = renderHook(() => useExportUserData());
		expect(typeof result.current.exportData).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls downloadJSON with exported data on success", async () => {
		const { result } = renderHook(() => useExportUserData());

		await act(async () => {
			result.current.exportData();
		});

		expect(mockDownloadJSON).toHaveBeenCalledWith(
			exportPayload,
			expect.stringMatching(/synclune-mes-donnees-.*\.json/),
		);
	});

	it("calls onSuccess with data when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useExportUserData({ onSuccess }));

		await act(async () => {
			result.current.exportData();
		});

		expect(onSuccess).toHaveBeenCalledWith(exportPayload);
	});

	it("calls onError with message when action fails", async () => {
		mockExportUserData.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useExportUserData({ onError }));

		await act(async () => {
			result.current.exportData();
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});

	it("does not call downloadJSON when action fails", async () => {
		mockExportUserData.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useExportUserData());

		await act(async () => {
			result.current.exportData();
		});

		expect(mockDownloadJSON).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useExportUserDataAdmin
// ============================================================================

describe("useExportUserDataAdmin", () => {
	const exportPayload = { orders: [], profile: { name: "Bob" } };

	beforeEach(() => {
		vi.clearAllMocks();
		mockExportUserDataAdmin.mockResolvedValue({
			status: "success" as const,
			message: "Export réussi",
			data: exportPayload,
		});
	});

	it("returns exportData and isPending", () => {
		const { result } = renderHook(() => useExportUserDataAdmin());
		expect(typeof result.current.exportData).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls exportUserDataAdmin with userId from FormData", async () => {
		const { result } = renderHook(() => useExportUserDataAdmin());

		await act(async () => {
			result.current.exportData("user-456", "Bob Martin");
		});

		expect(mockExportUserDataAdmin).toHaveBeenCalledWith("user-456");
	});

	it("calls downloadJSON with a filename containing the sanitized userName", async () => {
		const { result } = renderHook(() => useExportUserDataAdmin());

		await act(async () => {
			result.current.exportData("user-456", "Bob Martin");
		});

		expect(mockDownloadJSON).toHaveBeenCalledWith(
			exportPayload,
			expect.stringMatching(/synclune-donnees-bob-martin-.*\.json/),
		);
	});

	it("calls onSuccess with data when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useExportUserDataAdmin({ onSuccess }));

		await act(async () => {
			result.current.exportData("user-456", "Bob Martin");
		});

		expect(onSuccess).toHaveBeenCalledWith(exportPayload);
	});

	it("calls onError with message when action fails", async () => {
		mockExportUserDataAdmin.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useExportUserDataAdmin({ onError }));

		await act(async () => {
			result.current.exportData("user-456", "Bob Martin");
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});
});

// ============================================================================
// useInvalidateUserSessions
// ============================================================================

describe("useInvalidateUserSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockInvalidateUserSessions.mockResolvedValue(SUCCESS);
	});

	it("returns invalidate and isPending", () => {
		const { result } = renderHook(() => useInvalidateUserSessions());
		expect(typeof result.current.invalidate).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls invalidateUserSessions with userId from FormData", async () => {
		const { result } = renderHook(() => useInvalidateUserSessions());

		await act(async () => {
			result.current.invalidate("user-789", "Alice");
		});

		expect(mockInvalidateUserSessions).toHaveBeenCalledWith("user-789");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useInvalidateUserSessions({ onSuccess }));

		await act(async () => {
			result.current.invalidate("user-789", "Alice");
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onError with message when action fails", async () => {
		mockInvalidateUserSessions.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useInvalidateUserSessions({ onError }));

		await act(async () => {
			result.current.invalidate("user-789", "Alice");
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});

	it("does not call onSuccess when action fails", async () => {
		mockInvalidateUserSessions.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useInvalidateUserSessions({ onSuccess }));

		await act(async () => {
			result.current.invalidate("user-789", "Alice");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRestoreUser
// ============================================================================

describe("useRestoreUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRestoreUser.mockResolvedValue({ ...SUCCESS, message: "Utilisateur restauré" });
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useRestoreUser());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("handle appends id to FormData", async () => {
		const { result } = renderHook(() => useRestoreUser());

		await act(async () => {
			result.current.handle("user-123");
		});

		const formData = mockRestoreUser.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("user-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRestoreUser({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Utilisateur restauré");
	});

	it("does not call onSuccess when action fails", async () => {
		mockRestoreUser.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRestoreUser({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useSendPasswordResetAdmin
// ============================================================================

describe("useSendPasswordResetAdmin", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSendPasswordResetAdmin.mockResolvedValue(SUCCESS);
	});

	it("returns sendReset and isPending", () => {
		const { result } = renderHook(() => useSendPasswordResetAdmin());
		expect(typeof result.current.sendReset).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls sendPasswordResetAdmin with userId from FormData", async () => {
		const { result } = renderHook(() => useSendPasswordResetAdmin());

		await act(async () => {
			result.current.sendReset("user-abc", "Alice");
		});

		expect(mockSendPasswordResetAdmin).toHaveBeenCalledWith("user-abc");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSendPasswordResetAdmin({ onSuccess }));

		await act(async () => {
			result.current.sendReset("user-abc", "Alice");
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("calls onError with message when action fails", async () => {
		mockSendPasswordResetAdmin.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useSendPasswordResetAdmin({ onError }));

		await act(async () => {
			result.current.sendReset("user-abc", "Alice");
		});

		expect(onError).toHaveBeenCalledWith("Failed");
	});

	it("does not call onSuccess when action fails", async () => {
		mockSendPasswordResetAdmin.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSendPasswordResetAdmin({ onSuccess }));

		await act(async () => {
			result.current.sendReset("user-abc", "Alice");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useSuspendUser
// ============================================================================

describe("useSuspendUser", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSuspendUser.mockResolvedValue({ ...SUCCESS, message: "Utilisateur suspendu" });
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useSuspendUser());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("handle appends id to FormData", async () => {
		const { result } = renderHook(() => useSuspendUser());

		await act(async () => {
			result.current.handle("user-123");
		});

		const formData = mockSuspendUser.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("user-123");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSuspendUser({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123");
		});

		expect(onSuccess).toHaveBeenCalledWith("Utilisateur suspendu");
	});

	it("does not call onSuccess when action fails", async () => {
		mockSuspendUser.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSuspendUser({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useUpdateProfile
// ============================================================================

describe("useUpdateProfile", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateProfile.mockResolvedValue({ ...SUCCESS, message: "Profil mis à jour" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useUpdateProfile());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateProfile({ onSuccess }));

		const formData = new FormData();
		formData.append("name", "Alice");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).toHaveBeenCalledWith("Profil mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockUpdateProfile.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useUpdateProfile({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useChangeUserRole
// ============================================================================

describe("useChangeUserRole", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockChangeUserRole.mockResolvedValue({ ...SUCCESS, message: "Rôle mis à jour" });
	});

	it("returns state, action, isPending, and handle", () => {
		const { result } = renderHook(() => useChangeUserRole());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.handle).toBe("function");
	});

	it("handle appends id and role to FormData", async () => {
		const { result } = renderHook(() => useChangeUserRole());

		await act(async () => {
			result.current.handle("user-123", "ADMIN");
		});

		const formData = mockChangeUserRole.mock.calls[0]?.[1] as FormData;
		expect(formData.get("id")).toBe("user-123");
		expect(formData.get("role")).toBe("ADMIN");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useChangeUserRole({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123", "USER");
		});

		expect(onSuccess).toHaveBeenCalledWith("Rôle mis à jour");
	});

	it("does not call onSuccess when action fails", async () => {
		mockChangeUserRole.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useChangeUserRole({ onSuccess }));

		await act(async () => {
			result.current.handle("user-123", "USER");
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRequestEmailChange
// ============================================================================

describe("useRequestEmailChange", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequestEmailChange.mockResolvedValue({
			...SUCCESS,
			message: "Email de confirmation envoyé",
		});
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useRequestEmailChange());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRequestEmailChange({ onSuccess }));

		const formData = new FormData();
		formData.append("newEmail", "new@example.com");

		await act(async () => {
			result.current.action(formData);
		});

		expect(onSuccess).toHaveBeenCalledWith("Email de confirmation envoyé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockRequestEmailChange.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRequestEmailChange({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useDeleteAccount
// ============================================================================

describe("useDeleteAccount", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDeleteAccount.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useDeleteAccount());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteAccount({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("redirects to / via router.push on success", async () => {
		const { result } = renderHook(() => useDeleteAccount());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockRouterPush).toHaveBeenCalledWith("/");
	});

	it("calls router.refresh on success", async () => {
		const { result } = renderHook(() => useDeleteAccount());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockRouterRefresh).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockDeleteAccount.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteAccount({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not redirect when action fails", async () => {
		mockDeleteAccount.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useDeleteAccount());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockRouterPush).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRefreshUsers
// ============================================================================

describe("useRefreshUsers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshUsers.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshUsers());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshUsers action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshUsers());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshUsers).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshUsers({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshUsers.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshUsers({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});
