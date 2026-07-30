import { describe, it, expect, vi, beforeEach } from "vitest";
// ⚠️ Fixture volontairement NON préfixée `c` : avec `VALID_CUID` (héritage cuid v1),
// les 7 branches ci-dessous restaient vertes alors que la garde de forme de la page
// rejetait 96 % des ids réels — cf. checkout-return-order-id-cuid2.regression.
import { VALID_CUID2_NON_C } from "@/test/factories";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRedirect, mockRetrieve } = vi.hoisted(() => ({
	// redirect() doit THROW (comme le vrai next/navigation) pour interrompre
	// l'exécution — sinon le code retomberait sur le redirect("/") final.
	mockRedirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	mockRetrieve: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: mockRedirect,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		paymentIntents: { retrieve: mockRetrieve },
	},
}));

import CheckoutReturnPage from "../retour/page";

// ============================================================================
// Helpers
// ============================================================================

const PI_ID = "pi_test_123";

function run(params: Record<string, string>) {
	return CheckoutReturnPage({ searchParams: Promise.resolve(params) });
}

async function expectRedirectTo(params: Record<string, string>, matcher: (url: string) => void) {
	await expect(run(params)).rejects.toThrow(/NEXT_REDIRECT/);
	const url = mockRedirect.mock.calls.at(-1)![0] as string;
	matcher(url);
}

beforeEach(() => {
	vi.clearAllMocks();
});

// ============================================================================
// TEST-3DS-01 — table de décision de la page de retour 3DS
// ============================================================================

describe("CheckoutReturnPage — décision serveur sur pi.status", () => {
	it("succès : route vers /confirmation sur pi.status='succeeded', MÊME si redirect_status='failed' (on ignore redirect_status)", async () => {
		// Verrouille l'invariant clé : le succès dépend EXCLUSIVEMENT de pi.status
		// (retrieve serveur), jamais du redirect_status d'URL (manipulable).
		mockRetrieve.mockResolvedValue({ status: "succeeded", metadata: { orderNumber: "SYN-1" } });

		await expectRedirectTo(
			{ payment_intent: PI_ID, redirect_status: "failed", order_id: VALID_CUID2_NON_C },
			(url) => {
				expect(url).toContain("/paiement/confirmation");
				expect(url).toContain(`order_id=${VALID_CUID2_NON_C}`);
				expect(url).not.toContain("annulation");
			},
		);
	});

	it("échec AVANT attente : pi.status='requires_action' + redirect_status='failed' → /annulation reason=payment_failed", async () => {
		// Verrouille l'ordre des branches : un 3DS échoué laisse le PI en
		// requires_action ; sans le test failed-avant-pending il afficherait une
		// attente trompeuse (pending=true).
		mockRetrieve.mockResolvedValue({
			status: "requires_action",
			metadata: { orderNumber: "SYN-1" },
		});

		await expectRedirectTo(
			{ payment_intent: PI_ID, redirect_status: "failed", order_id: VALID_CUID2_NON_C },
			(url) => {
				expect(url).toContain("/paiement/annulation");
				expect(url).toContain("reason=payment_failed");
			},
		);
	});

	it("pi.status='canceled' → /annulation reason=payment_failed", async () => {
		mockRetrieve.mockResolvedValue({ status: "canceled", metadata: {} });

		await expectRedirectTo(
			{ payment_intent: PI_ID, redirect_status: "succeeded", order_id: VALID_CUID2_NON_C },
			(url) => {
				expect(url).toContain("/paiement/annulation");
				expect(url).toContain("reason=payment_failed");
			},
		);
	});

	it("en attente : pi.status='processing' (redirect_status succeeded) → /confirmation pending=true", async () => {
		mockRetrieve.mockResolvedValue({ status: "processing", metadata: { orderNumber: "SYN-1" } });

		await expectRedirectTo(
			{ payment_intent: PI_ID, redirect_status: "succeeded", order_id: VALID_CUID2_NON_C },
			(url) => {
				expect(url).toContain("/paiement/confirmation");
				expect(url).toContain("pending=true");
			},
		);
	});

	it("statut inattendu non-failed (requires_payment_method) → /annulation reason=processing_error", async () => {
		mockRetrieve.mockResolvedValue({ status: "requires_payment_method", metadata: {} });

		await expectRedirectTo(
			{ payment_intent: PI_ID, redirect_status: "succeeded", order_id: VALID_CUID2_NON_C },
			(url) => {
				expect(url).toContain("/paiement/annulation");
				expect(url).toContain("reason=processing_error");
			},
		);
	});

	it("retrieve Stripe en échec → /annulation reason=processing_error (jamais figé)", async () => {
		mockRetrieve.mockRejectedValue(new Error("Stripe down"));

		await expectRedirectTo(
			{ payment_intent: PI_ID, redirect_status: "succeeded", order_id: VALID_CUID2_NON_C },
			(url) => {
				expect(url).toContain("/paiement/annulation");
				expect(url).toContain("reason=processing_error");
			},
		);
	});

	it("URL de retour sans payment_intent valide → redirect vers l'accueil, aucun appel Stripe", async () => {
		await expect(run({})).rejects.toThrow(/NEXT_REDIRECT/);
		expect(mockRedirect).toHaveBeenLastCalledWith("/");
		expect(mockRetrieve).not.toHaveBeenCalled();
	});
});
