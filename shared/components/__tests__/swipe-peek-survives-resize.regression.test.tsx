/**
 * @regression swipe-peek-survives-resize — le peek d'une SwipeableCard n'est plus
 * relancé par un changement de seuil effectif.
 *
 * Bug corrigé (passe React 19.2, 2026-08-07) : l'effet du peek listait
 * `effectiveLeftThreshold` / `effectiveRightThreshold` en dépendances. Ces deux
 * valeurs dérivent de l'état `containerWidth`, écrit par le `ResizeObserver` du
 * composant — donc **tout redimensionnement du conteneur relançait les deux
 * timers**. Le `setTimeout` de fermeture déjà programmé était annulé, et la carte
 * restait visiblement ouverte `PEEK_DELAY_MS + PEEK_HOLD_MS` de plus avant de se
 * rouvrir. Le cas le plus atteignable est le montage lui-même (`containerWidth`
 * passe de 0 à la largeur mesurée) puis la rotation d'écran.
 *
 * Le corps du timer d'ouverture est désormais une `useEffectEvent` : les seuils
 * sont lus AU MOMENT DU TIR et sortent des dépendances.
 *
 * ⚠️ Le stub `ResizeObserver` de `test/setup.ts` est un no-op et
 * `getBoundingClientRect().width` vaut 0 en jsdom : on pilote donc le seuil
 * effectif par la **prop** `threshold`, qui est l'autre entrée de
 * `getEffectiveThreshold` (identité quand la largeur est nulle).
 */
import { render, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { normal: 0.2 },
		spring: { list: { type: "spring", stiffness: 400, damping: 30, mass: 1 } },
	},
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

import { SwipeableCard } from "../swipeable-card";

/** Mirrors the module-private constants of `swipeable-card.tsx`. */
const PEEK_DELAY_MS = 700;
const PEEK_HOLD_MS = 650;
const PEEK_OFFSET_RATIO = 0.55;

/** Reads the `translateX` offset (px) carried by the sliding card. */
function getOffset(container: HTMLElement): number {
	const card = Array.from(container.querySelectorAll("div")).find((div) =>
		div.style.transform.includes("translateX"),
	);
	const match = /translateX\((-?[\d.]+)px\)/.exec(card?.style.transform ?? "");
	if (!match) throw new Error(`No translateX found (got "${card?.style.transform}")`);
	return Number(match[1]);
}

const onAction = vi.fn();

function card(threshold: number) {
	return (
		<SwipeableCard
			peek
			rightAction={{ children: <span>Notes</span>, label: "Ouvrir les notes", onAction, threshold }}
		>
			<span>Card</span>
		</SwipeableCard>
	);
}

describe("@regression swipe-peek-survives-resize", () => {
	beforeEach(() => {
		mockReducedMotion.value = false;
		onAction.mockClear();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.runOnlyPendingTimers();
		vi.useRealTimers();
		cleanup();
	});

	it("ouvre le peek à l'échéance initiale même si le seuil change pendant le compte à rebours", () => {
		const { container, rerender } = render(card(100));

		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(getOffset(container)).toBe(0);

		// Un resize du conteneur (rotation, ouverture du clavier, virtualisation de
		// liste) recalcule `effectiveRightThreshold`. Avant le correctif, ce seul
		// changement relançait les deux timers.
		rerender(card(120));

		act(() => {
			vi.advanceTimersByTime(PEEK_DELAY_MS - 400);
		});

		// Le peek s'ouvre bien à t = PEEK_DELAY_MS, et à la magnitude du seuil
		// COURANT (120 × 0,55) — preuve que l'effect event lit la valeur au tir.
		expect(getOffset(container)).toBeCloseTo(120 * PEEK_OFFSET_RATIO, 5);
	});

	it("referme le peek à l'échéance initiale, sans réouverture ultérieure", () => {
		const { container, rerender } = render(card(100));

		act(() => {
			vi.advanceTimersByTime(400);
		});
		rerender(card(120));

		act(() => {
			vi.advanceTimersByTime(PEEK_DELAY_MS - 400);
		});
		expect(getOffset(container)).not.toBe(0);

		act(() => {
			vi.advanceTimersByTime(PEEK_HOLD_MS);
		});
		expect(getOffset(container)).toBe(0);

		// Aucun timer résiduel ne doit rouvrir la carte plus tard.
		act(() => {
			vi.advanceTimersByTime(PEEK_DELAY_MS + PEEK_HOLD_MS);
		});
		expect(getOffset(container)).toBe(0);
		expect(onAction).not.toHaveBeenCalled();
	});
});
