/**
 * `clearCartAfterOrder` — appelée au montage de `/paiement/retour` : le webhook
 * (serveur-à-serveur) ne porte aucun cookie client, seul ce chemin peut vider
 * le panier après paiement. Le pire cas d'un appel hostile est de vider son
 * PROPRE panier, d'où l'absence de garde.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

const mocks = vi.hoisted(() => ({
	clearCartCookie: vi.fn(),
}));

vi.mock("@/modules/cart/lib/cart-cookie", () => ({
	clearCartCookie: mocks.clearCartCookie,
}));
// handleActionError logge les erreurs techniques — on coupe le bruit console.
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { clearCartAfterOrder } from "../clear-cart-after-order";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("clearCartAfterOrder", () => {
	it("supprime le cookie et confirme", async () => {
		const result = await clearCartAfterOrder();
		expect(result.status).toBe(ActionStatus.SUCCESS);
		expect(mocks.clearCartCookie).toHaveBeenCalledOnce();
	});

	it("convertit un échec technique en ActionState ERROR sans fuiter le détail", async () => {
		mocks.clearCartCookie.mockRejectedValue(new Error("cookie store exploded"));
		const result = await clearCartAfterOrder();
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Impossible de vider le panier");
	});
});
