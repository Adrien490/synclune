import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockRequireAdmin,
	mockEnforceRateLimit,
	mockReconcileRefunds,
	mockSyncAsyncPayments,
	mockCleanupOrphanMedia,
	mockLogger,
} = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockReconcileRefunds: vi.fn(),
	mockSyncAsyncPayments: vi.fn(),
	mockCleanupOrphanMedia: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({
	requireAdmin: mockRequireAdmin,
}));

vi.mock("@/modules/admin-auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));

vi.mock("../../services/reconcile-refunds.service", () => ({
	reconcileRefunds: mockReconcileRefunds,
}));

vi.mock("../../services/sync-async-payments.service", () => ({
	syncAsyncPayments: mockSyncAsyncPayments,
}));

vi.mock("../../services/cleanup-orphan-media.service", () => ({
	cleanupOrphanMedia: mockCleanupOrphanMedia,
}));

vi.mock("@/shared/lib/logger", () => ({
	logger: mockLogger,
}));

import { runMaintenanceTask } from "../run-maintenance-task";
import { MAINTENANCE_TASK_IDS } from "../../constants/maintenance-tasks";
import { ActionStatus } from "@/shared/types/server-action";

const RUNNERS = {
	"reconcile-refunds": mockReconcileRefunds,
	"sync-async-payments": mockSyncAsyncPayments,
	"cleanup-orphan-media": mockCleanupOrphanMedia,
} as const;

function formDataWith(task: string): FormData {
	const fd = new FormData();
	fd.set("task", task);
	return fd;
}

const OK_RESULT = { processed: 3, errored: 0, skipped: 1 };

describe("runMaintenanceTask", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ ok: true });
		mockEnforceRateLimit.mockResolvedValue({ ok: true });
		for (const runner of Object.values(RUNNERS)) {
			runner.mockResolvedValue(OK_RESULT);
		}
	});

	it("returns the auth error without running anything when not admin", async () => {
		const authError = { error: { status: ActionStatus.FORBIDDEN, message: "Accès refusé" } };
		mockRequireAdmin.mockResolvedValue(authError);

		const result = await runMaintenanceTask(undefined, formDataWith("reconcile-refunds"));

		expect(result).toBe(authError.error);
		for (const runner of Object.values(RUNNERS)) {
			expect(runner).not.toHaveBeenCalled();
		}
	});

	it("returns the rate-limit error without running anything when throttled", async () => {
		const limitError = { error: { status: ActionStatus.ERROR, message: "Trop de tentatives" } };
		mockEnforceRateLimit.mockResolvedValue(limitError);

		const result = await runMaintenanceTask(undefined, formDataWith("reconcile-refunds"));

		expect(result).toBe(limitError.error);
		expect(mockReconcileRefunds).not.toHaveBeenCalled();
	});

	it("rejects an unknown task id (Zod enum) without running anything", async () => {
		const result = await runMaintenanceTask(undefined, formDataWith("drop-database"));

		expect(result.status).not.toBe(ActionStatus.SUCCESS);
		for (const runner of Object.values(RUNNERS)) {
			expect(runner).not.toHaveBeenCalled();
		}
	});

	it.each(MAINTENANCE_TASK_IDS)("dispatches %s to its service and ONLY it", async (task) => {
		const result = await runMaintenanceTask(undefined, formDataWith(task));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		for (const [id, runner] of Object.entries(RUNNERS)) {
			expect(runner).toHaveBeenCalledTimes(id === task ? 1 : 0);
		}
	});

	it("reports the counts in the success message", async () => {
		mockReconcileRefunds.mockResolvedValue({ processed: 5, errored: 0, skipped: 2 });

		const result = await runMaintenanceTask(undefined, formDataWith("reconcile-refunds"));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("5 traité(s)");
		expect(result.message).toContain("2 ignoré(s)");
	});

	it("signals a partial run (hasMore) so the admin relaunches", async () => {
		mockCleanupOrphanMedia.mockResolvedValue({
			processed: 10,
			errored: 0,
			skipped: 0,
			hasMore: true,
		});

		const result = await runMaintenanceTask(undefined, formDataWith("cleanup-orphan-media"));

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("relance");
	});

	it("returns an error state when the service reports errored > 0", async () => {
		mockReconcileRefunds.mockResolvedValue({ processed: 1, errored: 2, skipped: 0 });

		const result = await runMaintenanceTask(undefined, formDataWith("reconcile-refunds"));

		expect(result.status).not.toBe(ActionStatus.SUCCESS);
		expect(result.message).toContain("2 en erreur");
	});

	it("wraps a throwing service in a generic error state", async () => {
		mockSyncAsyncPayments.mockRejectedValue(new Error("stripe down"));

		const result = await runMaintenanceTask(undefined, formDataWith("sync-async-payments"));

		expect(result.status).not.toBe(ActionStatus.SUCCESS);
	});
});
