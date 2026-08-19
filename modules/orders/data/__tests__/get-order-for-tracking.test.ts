/**
 * @regression order-tracking-anti-enumeration
 *
 * `getOrderForTracking` est le SEUL accès client à une commande. Le token est
 * vérifié CONTRE l'email en base : un token valide pour la commande A ne donne
 * jamais la commande B, et toute défaillance (secret absent, commande inconnue,
 * email vide, incident DB) rend `null` — la page fait notFound(), indistinct
 * d'un token faux (anti-énumération, y compris sur incident).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signOrderTrackingToken } from "../../lib/order-tracking-token";
import { getOrderForTracking } from "../get-order-for-tracking";

const mocks = vi.hoisted(() => ({
	findUnique: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { order: { findUnique: mocks.findUnique } },
}));

const SECRET = "test-secret-of-sufficient-length-000";
const ORDER_ID = "k3x9m2p8q1r5s7t0uvwxyz012345";
const EMAIL = "cliente@example.com";
const ORDER = { id: ORDER_ID, email: EMAIL, status: "SHIPPED" };
const VALID_TOKEN = signOrderTrackingToken(ORDER_ID, EMAIL, SECRET);

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubEnv("AUTH_SECRET", SECRET);
	mocks.findUnique.mockResolvedValue(ORDER);
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("getOrderForTracking", () => {
	it("nominal : token signé pour cette commande → la commande", async () => {
		await expect(getOrderForTracking(ORDER_ID, VALID_TOKEN)).resolves.toBe(ORDER);
	});

	it("fail-closed : sans AUTH_SECRET, null SANS lire la base", async () => {
		vi.stubEnv("AUTH_SECRET", "");
		await expect(getOrderForTracking(ORDER_ID, VALID_TOKEN)).resolves.toBeNull();
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("orderId ou token vide : null sans lire la base", async () => {
		await expect(getOrderForTracking("", VALID_TOKEN)).resolves.toBeNull();
		await expect(getOrderForTracking(ORDER_ID, "")).resolves.toBeNull();
		expect(mocks.findUnique).not.toHaveBeenCalled();
	});

	it("commande inconnue : null (indistinct d'un token faux)", async () => {
		mocks.findUnique.mockResolvedValue(null);
		await expect(getOrderForTracking(ORDER_ID, VALID_TOKEN)).resolves.toBeNull();
	});

	it("commande sans email (PENDING, adresse pas encore écrite) : null", async () => {
		mocks.findUnique.mockResolvedValue({ ...ORDER, email: "" });
		await expect(getOrderForTracking(ORDER_ID, VALID_TOKEN)).resolves.toBeNull();
	});

	it("anti-énumération : le token d'une AUTRE commande est refusé", async () => {
		const otherToken = signOrderTrackingToken("autreorderid0000000000000000", EMAIL, SECRET);
		await expect(getOrderForTracking(ORDER_ID, otherToken)).resolves.toBeNull();
	});

	it("incident DB : null loggé, jamais une erreur qui remonte à la page", async () => {
		mocks.findUnique.mockRejectedValue(new Error("connection refused"));
		await expect(getOrderForTracking(ORDER_ID, VALID_TOKEN)).resolves.toBeNull();
	});
});
