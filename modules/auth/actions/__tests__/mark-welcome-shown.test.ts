import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { VALID_USER_ID } from "@/test/factories";

const { mockRequireAuth, mockPrisma, mockSuccess, mockHandleActionError } = vi.hoisted(() => ({
	mockRequireAuth: vi.fn(),
	mockPrisma: { user: { updateMany: vi.fn() } },
	mockSuccess: vi.fn(),
	mockHandleActionError: vi.fn(),
}));

vi.mock("@/modules/auth/lib/require-auth", () => ({ requireAuth: mockRequireAuth }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/actions", () => ({
	success: mockSuccess,
	handleActionError: mockHandleActionError,
}));

import { markWelcomeShown } from "../mark-welcome-shown";

describe("markWelcomeShown", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		mockRequireAuth.mockResolvedValue({ user: { id: VALID_USER_ID } });
		mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
		mockSuccess.mockImplementation((message: string) => ({
			status: ActionStatus.SUCCESS,
			message,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, message: string) => ({
			status: ActionStatus.ERROR,
			message,
		}));
	});

	it("returns the auth error when user is not authenticated", async () => {
		const authError = {
			status: ActionStatus.UNAUTHORIZED,
			message: "Vous devez être connecté pour effectuer cette action.",
		};
		mockRequireAuth.mockResolvedValue({ error: authError });

		const result = await markWelcomeShown();

		expect(result).toEqual(authError);
		expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
	});

	it("marks welcomeShownAt only when it is currently null (idempotent guard)", async () => {
		await markWelcomeShown();

		expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(1);
		expect(mockPrisma.user.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: VALID_USER_ID, welcomeShownAt: null },
				data: expect.objectContaining({ welcomeShownAt: expect.any(Date) }),
			}),
		);
	});

	it("returns success on first dismissal", async () => {
		const result = await markWelcomeShown();

		expect(mockSuccess).toHaveBeenCalledOnce();
		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("returns success even when no row was updated (already dismissed)", async () => {
		mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });

		const result = await markWelcomeShown();

		expect(result.status).toBe(ActionStatus.SUCCESS);
	});

	it("delegates to handleActionError when prisma throws", async () => {
		mockPrisma.user.updateMany.mockRejectedValue(new Error("DB unreachable"));

		const result = await markWelcomeShown();

		expect(mockHandleActionError).toHaveBeenCalledOnce();
		expect(result.status).toBe(ActionStatus.ERROR);
	});
});
