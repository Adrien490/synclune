/**
 * @regression order-status-toctou
 *
 * Audit statuts commande 2026-07-02 (F1) : les 5 actions admin de transition
 * validaient le statut sur un `findUnique` puis faisaient un `update`
 * inconditionnel. Quatre d'entre elles ont fusionné dans `updateOrderStatus`
 * (2026-08-05) — la garde doit tenir POUR CHAQUE CLÉ DE TRANSITION, pas
 * seulement pour l'action. En read-committed le findUnique ne verrouille
 * pas la ligne : un writer concurrent (autre admin, webhook cancel, cron)
 * pouvait changer l'état entre le fetch et l'update — ex. SHIPPED posé sur
 * une commande devenue CANCELLED.
 *
 * Le fix ré-asserte le statut attendu dans le `where` d'un `updateMany`
 * atomique (pattern cancel-order IDEM-CANCEL-001). Ce test verrouille le
 * comportement `count === 0` : erreur CONCURRENT_CHANGE, AUCUN audit
 * OrderHistory, AUCUNE invalidation cache, AUCUN email.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { createMockFormData, createMockOrder, VALID_CUID } from "@/test/factories";

const {
	mockPrisma,
	mockRequireAdminWithUser,
	mockEnforceRateLimit,
	mockUpdateTag,
	mockValidateInput,
	mockHandleActionError,
	mockError,
	mockNotFound,
	mockSuccess,
	mockCreateOrderAudit,
	mockCreateOrderAuditTx,
	mockGetOrderInvalidationTags,
	mockSendShippingConfirmationEmail,
} = vi.hoisted(() => ({
	mockPrisma: {
		order: { findUnique: vi.fn(), updateMany: vi.fn() },
		$transaction: vi.fn(),
	},
	mockRequireAdminWithUser: vi.fn(),
	mockEnforceRateLimit: vi.fn(),
	mockUpdateTag: vi.fn(),
	mockValidateInput: vi.fn(),
	mockHandleActionError: vi.fn(),
	mockError: vi.fn(),
	mockNotFound: vi.fn(),
	mockSuccess: vi.fn(),
	mockCreateOrderAudit: vi.fn(),
	mockCreateOrderAuditTx: vi.fn(),
	mockGetOrderInvalidationTags: vi.fn(),
	mockSendShippingConfirmationEmail: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma, notDeleted: { deletedAt: null } }));
vi.mock("@/modules/auth/lib/require-auth", () => ({
	requireAdminWithUser: mockRequireAdminWithUser,
}));
vi.mock("@/modules/auth/lib/rate-limit-helpers", () => ({
	enforceRateLimitForCurrentUser: mockEnforceRateLimit,
}));
vi.mock("next/cache", () => ({ updateTag: mockUpdateTag }));
vi.mock("@/shared/lib/actions", () => ({
	safeFormGet: (formData: FormData, key: string) => {
		const v = formData.get(key);
		return typeof v === "string" ? v : null;
	},
	validateInput: mockValidateInput,
	handleActionError: mockHandleActionError,
	error: mockError,
	notFound: mockNotFound,
	success: mockSuccess,
}));
vi.mock("@/shared/lib/sanitize", () => ({ sanitizeText: (t: string) => t }));
vi.mock("../../utils/order-audit", () => ({
	createOrderAudit: mockCreateOrderAudit,
	createOrderAuditTx: mockCreateOrderAuditTx,
}));
vi.mock("../../constants/cache", () => ({
	getOrderInvalidationTags: mockGetOrderInvalidationTags,
	ORDERS_CACHE_TAGS: { REFUNDS: (orderId: string) => `order-refunds-${orderId}` },
}));
// Prédicats métier : tous permissifs — la TOCTOU se joue APRÈS la validation,
// le updateMany atomique est le seul filet testé ici.
vi.mock("../../services/order-status-validation.service", () => ({
	canMarkAsShipped: vi.fn().mockReturnValue({ canShip: true }),
	canMarkAsDelivered: vi.fn().mockReturnValue({ canDeliver: true }),
	canMarkAsProcessing: vi.fn().mockReturnValue({ canProcess: true }),
	canMarkAsReturned: vi.fn().mockReturnValue({ canReturn: true }),
	canRevertToProcessing: vi.fn().mockReturnValue({ canRevert: true }),
}));
vi.mock("@/modules/emails/services/order-emails", () => ({
	sendShippingConfirmationEmail: mockSendShippingConfirmationEmail,
}));

import { markAsShipped } from "../mark-as-shipped";
import { updateOrderStatus } from "../update-order-status";
import { ORDER_ERROR_MESSAGES } from "../../constants/order.constants";

const formData = createMockFormData({ id: VALID_CUID });

/** `updateOrderStatus` lit la clé dans le FormData — un par transition. */
function transitionFormData(transition: string) {
	return createMockFormData({ id: VALID_CUID, transition, reason: "raison valide" });
}

describe("@regression order-status-toctou — updateMany count===0 ⇒ abort propre", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockRequireAdminWithUser.mockResolvedValue({ user: { id: "admin-1", name: "Admin" } });
		mockEnforceRateLimit.mockResolvedValue({ success: true });
		// ÉCHO plutôt que valeur fixe : `updateOrderStatus` lit `data.transition`,
		// et une valeur fixe ferait passer les 4 clés par la même branche de config.
		mockValidateInput.mockImplementation((_schema: unknown, data: Record<string, unknown>) => ({
			data: {
				id: VALID_CUID,
				trackingNumber: "1Z999",
				sendEmail: true,
				reason: "raison valide",
				// Seules les clés RENSEIGNÉES écrasent les valeurs par défaut : un
				// `safeFormGet` absent rend `null`, et l'écrasement aveugle privait
				// `markAsShipped` de son numéro de suivi.
				...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)),
			},
		}));
		mockGetOrderInvalidationTags.mockReturnValue(["orders-list"]);
		mockError.mockImplementation((msg: string) => ({ status: ActionStatus.ERROR, message: msg }));
		mockNotFound.mockImplementation((r: string) => ({
			status: ActionStatus.NOT_FOUND,
			message: `${r} non trouvé`,
		}));
		mockSuccess.mockImplementation((msg: string) => ({
			status: ActionStatus.SUCCESS,
			message: msg,
		}));
		mockHandleActionError.mockImplementation((_e: unknown, fallback: string) => ({
			status: ActionStatus.ERROR,
			message: fallback,
		}));

		mockPrisma.$transaction.mockImplementation(
			async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
		);
		// La commande lue est dans l'état attendu (validation OK)…
		mockPrisma.order.findUnique.mockResolvedValue(
			createMockOrder({
				status: "PROCESSING",
				paymentStatus: "PAID",
			}),
		);
		// …mais un writer concurrent l'a changée avant l'update atomique.
		mockPrisma.order.updateMany.mockResolvedValue({ count: 0 });
	});

	const actions: Array<[string, () => Promise<{ status: string; message?: string }>]> = [
		["markAsShipped", () => markAsShipped(undefined, formData)],
		...(["delivered", "processing", "returned", "revert-to-processing"] as const).map(
			(t) =>
				[`updateOrderStatus(${t})`, () => updateOrderStatus(undefined, transitionFormData(t))] as [
					string,
					() => Promise<{ status: string; message?: string }>,
				],
		),
	];

	for (const [name, run] of actions) {
		it(`${name} : erreur CONCURRENT_CHANGE, aucun audit, aucune invalidation, aucun email`, async () => {
			const result = await run();

			expect(result.status).toBe(ActionStatus.ERROR);
			expect(result.message).toBe(ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE);
			// L'audit et l'invalidation doivent rester conditionnés au count > 0 :
			// une entrée SHIPPED/DELIVERED sur une commande annulée fausserait
			// l'audit trail (Art. L123-22) et l'invalidation serait mensongère.
			expect(mockCreateOrderAuditTx).not.toHaveBeenCalled();
			expect(mockCreateOrderAudit).not.toHaveBeenCalled();
			expect(mockUpdateTag).not.toHaveBeenCalled();
			expect(mockSendShippingConfirmationEmail).not.toHaveBeenCalled();
		});
	}

	it("le where du updateMany ré-asserte le statut attendu (filet atomique)", async () => {
		await markAsShipped(undefined, formData);

		expect(mockPrisma.order.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: VALID_CUID,
					status: "PROCESSING",
					paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] },
				}),
			}),
		);
	});
});
