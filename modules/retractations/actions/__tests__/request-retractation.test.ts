/**
 * @regression retractation-public-action-guards
 *
 * `requestRetractation` est un endpoint RPC PUBLIC : ses gardes sont le parse
 * Zod puis le token HMAC, vérifiés AVANT toute écriture. Un token faux rend
 * la même erreur qu'une commande inconnue (anti-énumération), et l'unicité
 * `@unique(orderId)` fait de P2002 « demande déjà enregistrée ».
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { signOrderTrackingToken } from "@/modules/orders/lib/order-tracking-token";
import { requestRetractation } from "../request-retractation";

const { FakePrismaKnownRequestError } = vi.hoisted(() => {
	class FakePrismaKnownRequestError extends Error {
		code: string;
		constructor(code: string) {
			super(`fake prisma error ${code}`);
			this.code = code;
		}
	}
	return { FakePrismaKnownRequestError };
});

vi.mock("@/app/generated/prisma/client", () => ({
	Prisma: { PrismaClientKnownRequestError: FakePrismaKnownRequestError },
}));

const mocks = vi.hoisted(() => ({
	orderFindUnique: vi.fn(),
	retractationCreate: vi.fn(),
	retractationUpdateMany: vi.fn(),
	sendRetractationAckEmail: vi.fn(),
	updateTagsAfterMutation: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: {
		order: { findUnique: mocks.orderFindUnique },
		retractationRequest: {
			create: mocks.retractationCreate,
			updateMany: mocks.retractationUpdateMany,
		},
	},
}));
vi.mock("@/modules/emails/services/send-retractation-emails", () => ({
	sendRetractationAckEmail: mocks.sendRetractationAckEmail,
}));
vi.mock("@/shared/lib/cache", () => ({
	updateTagsAfterMutation: mocks.updateTagsAfterMutation,
}));

const SECRET = "unit-test-secret-0000000000000000000";
const ORDER_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";
const EMAIL = "cliente@example.com";

const ORDER = {
	id: ORDER_ID,
	invoiceNumber: 1,
	email: EMAIL,
	customerName: "Marie",
	status: "SHIPPED",
};

function makeFormData(entries: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(entries)) formData.set(key, value);
	return formData;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("AUTH_SECRET", SECRET);
	mocks.orderFindUnique.mockResolvedValue(ORDER);
	mocks.retractationCreate.mockResolvedValue({ id: "ret-1" });
	mocks.retractationUpdateMany.mockResolvedValue({ count: 1 });
	mocks.sendRetractationAckEmail.mockResolvedValue({ success: true, data: { id: "e" } });
});

describe("requestRetractation", () => {
	const validToken = () => signOrderTrackingToken(ORDER_ID, EMAIL, SECRET);

	it("crée la demande RECEIVED, envoie l'accusé SANS DÉLAI, puis passe ACKNOWLEDGED", async () => {
		const result = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: validToken(), reason: "Trop grande" }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.retractationCreate).toHaveBeenCalledWith({
			data: { orderId: ORDER_ID, reason: "Trop grande", status: "RECEIVED" },
			select: { id: true },
		});
		expect(mocks.sendRetractationAckEmail).toHaveBeenCalledTimes(1);
		expect(mocks.retractationUpdateMany).toHaveBeenCalledWith({
			where: { id: "ret-1", status: "RECEIVED" },
			data: expect.objectContaining({ status: "ACKNOWLEDGED" }),
		});
	});

	it("token faux : refus AVANT toute écriture, même message qu'une commande inconnue", async () => {
		const bad = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: "0".repeat(64) }),
		);
		mocks.orderFindUnique.mockResolvedValue(null);
		const unknown = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: validToken() }),
		);

		expect(bad.status).toBe(ActionStatus.ERROR);
		expect(bad.message).toBe(unknown.message);
		expect(mocks.retractationCreate).not.toHaveBeenCalled();
	});

	it("parse Zod AVANT tout : token malformé = validation error, aucune lecture DB", async () => {
		const result = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: "pas-un-token" }),
		);

		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(mocks.orderFindUnique).not.toHaveBeenCalled();
	});

	it("P2002 (unicité par commande) : « demande déjà enregistrée », pas d'accusé", async () => {
		mocks.retractationCreate.mockRejectedValue(new FakePrismaKnownRequestError("P2002"));

		const result = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: validToken() }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toContain("déjà enregistrée");
		expect(mocks.sendRetractationAckEmail).not.toHaveBeenCalled();
	});

	it("accusé en échec : la demande RESTE RECEIVED (pas d'ACKNOWLEDGED menteur)", async () => {
		mocks.sendRetractationAckEmail.mockResolvedValue({ success: false, error: new Error("down") });

		const result = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: validToken() }),
		);

		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.retractationUpdateMany).not.toHaveBeenCalled();
	});

	it("commande non encaissée (PENDING/CANCELLED/REFUNDED) : refus", async () => {
		mocks.orderFindUnique.mockResolvedValue({ ...ORDER, status: "CANCELLED" });

		const result = await requestRetractation(
			undefined,
			makeFormData({ orderId: ORDER_ID, token: validToken() }),
		);

		expect(result.status).toBe(ActionStatus.ERROR);
		expect(mocks.retractationCreate).not.toHaveBeenCalled();
	});
});
