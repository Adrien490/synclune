/**
 * @regression toaster-live-regions-mounted
 *
 * `announce()` (`shared/utils/announce.ts`) écrit dans deux nœuds par id et fait
 * un **no-op silencieux** s'ils sont absents. Ces nœuds sont rendus par
 * `AppToaster`, monté une seule fois dans le layout racine.
 *
 * Avant ce test, le couplage n'était vérifié dans aucun sens :
 *  - `toast.test.ts` teste bien l'annonce, mais **fabrique lui-même** les div
 *    `#toast-live-*` dans le DOM de test ;
 *  - `AppToaster` n'avait aucun test unitaire.
 *
 * Conséquence : supprimer ou renommer ces div cassait toutes les annonces
 * screen-reader de l'application sans faire échouer un seul test. Les ids
 * viennent désormais d'une SSOT (`ANNOUNCE_REGION_IDS`) et ce test verrouille
 * leur présence et leurs attributs.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
	Toaster: (props: Record<string, unknown>) => (
		<div data-testid="sonner-toaster" data-position={String(props.position)} />
	),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => false,
	MOBILE_MEDIA_QUERY: "(width < 48rem)",
}));

vi.mock("@/shared/hooks/use-media-query", () => ({
	useMediaQuery: () => false,
}));

import { AppToaster } from "@/shared/components/ui/toaster";
import { announce, ANNOUNCE_REGION_IDS } from "@/shared/utils/announce";

afterEach(() => {
	cleanup();
});

describe("AppToaster — régions d'annonce", () => {
	it("monte la région polite avec role=status et aria-atomic", () => {
		render(<AppToaster />);

		const node = document.getElementById(ANNOUNCE_REGION_IDS.polite);
		expect(node).not.toBeNull();
		expect(node).toHaveAttribute("role", "status");
		expect(node).toHaveAttribute("aria-live", "polite");
		expect(node).toHaveAttribute("aria-atomic", "true");
		expect(node).toHaveClass("sr-only");
	});

	it("monte la région assertive avec role=alert", () => {
		render(<AppToaster />);

		const node = document.getElementById(ANNOUNCE_REGION_IDS.assertive);
		expect(node).not.toBeNull();
		expect(node).toHaveAttribute("role", "alert");
		expect(node).toHaveAttribute("aria-live", "assertive");
		expect(node).toHaveAttribute("aria-atomic", "true");
		expect(node).toHaveClass("sr-only");
	});

	it("les deux régions sont vides au montage (sinon rien ne serait annoncé)", () => {
		render(<AppToaster />);

		expect(document.getElementById(ANNOUNCE_REGION_IDS.polite)).toHaveTextContent("");
		expect(document.getElementById(ANNOUNCE_REGION_IDS.assertive)).toHaveTextContent("");
	});

	/**
	 * Le test bidirectionnel : `announce()` doit réellement atteindre les nœuds
	 * rendus par `AppToaster`, sans qu'aucun DOM ne soit fabriqué par le test.
	 */
	it("announce() écrit dans les régions rendues par AppToaster", async () => {
		const rafSpy = vi
			.spyOn(globalThis, "requestAnimationFrame")
			.mockImplementation((cb: FrameRequestCallback) => {
				cb(0);
				return 0;
			});

		render(<AppToaster />);

		announce("Article ajouté au panier", "polite");
		announce("Une erreur est survenue", "assertive");

		expect(document.getElementById(ANNOUNCE_REGION_IDS.polite)).toHaveTextContent(
			"Article ajouté au panier",
		);
		expect(document.getElementById(ANNOUNCE_REGION_IDS.assertive)).toHaveTextContent(
			"Une erreur est survenue",
		);

		rafSpy.mockRestore();
	});
});
