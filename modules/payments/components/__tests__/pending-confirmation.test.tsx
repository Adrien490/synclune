/**
 * Le bloc « paiement en cours » ne doit JAMAIS promettre une mise à jour
 * automatique qui n'a plus lieu : après épuisement du polling (20 × 3 s), le
 * texte bascule vers « vérifie tes emails » (audit 2026-08-15, F3 — avant ça,
 * le poller s'arrêtait en silence sous une page qui continuait de promettre).
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const refresh = vi.fn();
	// Objet STABLE entre les rendus, comme le vrai routeur Next : un objet neuf
	// à chaque rendu ré-armerait l'effet (deps [router]) après la bascule
	// `exhausted` et relancerait un polling que le composant a coupé.
	return { refresh, router: { refresh } };
});

vi.mock("next/navigation", () => ({
	useRouter: () => mocks.router,
}));

import { PendingConfirmation } from "../pending-confirmation";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 20;

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("PendingConfirmation", () => {
	it("affiche la promesse de mise à jour automatique tant que le polling tourne", () => {
		const { getByText } = render(<PendingConfirmation />);

		expect(getByText("Paiement en cours de confirmation…")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(POLL_INTERVAL_MS * 3);
		});

		expect(mocks.refresh).toHaveBeenCalledTimes(3);
		expect(getByText("Paiement en cours de confirmation…")).toBeInTheDocument();
	});

	it("après épuisement : exactement MAX_POLLS rafraîchissements, texte « vérifie tes emails »", () => {
		const { getByText, queryByText } = render(<PendingConfirmation />);

		act(() => {
			// +1 : le tick suivant les MAX_POLLS est celui qui coupe et bascule.
			vi.advanceTimersByTime(POLL_INTERVAL_MS * (MAX_POLLS + 1));
		});

		expect(mocks.refresh).toHaveBeenCalledTimes(MAX_POLLS);
		expect(getByText("La confirmation prend plus de temps que prévu")).toBeInTheDocument();
		expect(queryByText("Paiement en cours de confirmation…")).not.toBeInTheDocument();

		// L'intervalle est bien coupé : plus aucun refresh, même longtemps après.
		act(() => {
			vi.advanceTimersByTime(POLL_INTERVAL_MS * 10);
		});
		expect(mocks.refresh).toHaveBeenCalledTimes(MAX_POLLS);
	});

	it("la bascule est annoncée aux lecteurs d'écran (aria-live sur le conteneur)", () => {
		const { container } = render(<PendingConfirmation />);

		expect(container.querySelector("[aria-live='polite']")).not.toBeNull();
	});
});
