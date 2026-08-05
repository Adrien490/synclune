/**
 * @regression filter-badge-swipe-left-only
 *
 * Verrouille la convention iOS gauche-only sur swipe-to-dismiss du FilterBadge.
 *
 * Historique : avant audit 2026-05-24, `onDragEnd` utilisait `Math.abs(info.offset.x) > 80`
 * → swipe droite ET gauche déclenchaient la suppression. Aucun précédent UX mobile (Mail,
 * Messages, Sonner, Vaul = gauche uniquement) et risque de suppression accidentelle pendant
 * scroll horizontal d'une rangée de 6 badges (perte de filtre irréversible).
 *
 * Si ces tests cassent : ne PAS les "fixer" en restaurant le comportement bidirectionnel.
 * Re-discuter la spec produit avant d'élargir.
 *
 * Extension 2026-08-05 (ré-audit FilterBadge) : le seuil accepte aussi le FLICK
 * (geste court mais vif — distance ET vélocité, la vraie convention iOS), toujours
 * gauche uniquement : offset < -24px ET vélocité < -500px/s. Un flick DROIT ou un
 * micro-geste rapide (< 24px) ne suppriment jamais.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

const { mockReducedMotion, mockIsTouchDevice, lastMotionProps } = vi.hoisted(() => ({
	mockReducedMotion: { value: false as boolean | null },
	mockIsTouchDevice: { value: true },
	lastMotionProps: {
		value: null as {
			onDragEnd?: (
				event: unknown,
				info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
			) => void;
		} | null,
	},
}));

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		m: {
			button: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						drag: _d,
						dragConstraints: _dc,
						dragElastic: _de,
						onDragEnd,
						style: _s,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					lastMotionProps.value = { onDragEnd: onDragEnd as never };
					const { createElement } = require("react");
					return createElement("button", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: () => mockReducedMotion.value,
		useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
		useTransform: () => ({ get: () => 1 }),
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		duration: { fast: 0.15 },
		easing: { easeInOut: [0.25, 0.1, 0.25, 1] },
	},
	maybeReduceMotion: (config: unknown) => config,
}));

vi.mock("@/shared/hooks/use-touch-device", () => ({
	useIsTouchDevice: () => mockIsTouchDevice.value,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: vi.fn(),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	XIcon: (props: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { "data-testid": "x-icon", ...props });
	},
}));

import { FilterBadge } from "../filter-badge";
import type { FilterDefinition } from "@/shared/hooks/use-filter";

describe("@regression filter-badge-swipe-left-only", () => {
	const baseFilter: FilterDefinition = {
		id: "color-red",
		key: "color",
		value: "red",
		label: "Couleur",
		displayValue: "Rouge",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
		mockIsTouchDevice.value = true;
		lastMotionProps.value = null;
	});

	afterEach(cleanup);

	it("supprime sur swipe GAUCHE au-delà du seuil (-120px)", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -120, y: 0 }, velocity: { x: 0, y: 0 } });

		expect(onRemove).toHaveBeenCalledWith("color", "red");
	});

	it("NE supprime PAS sur swipe DROITE au-delà du seuil (+120px) — convention iOS", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: 120, y: 0 }, velocity: { x: 0, y: 0 } });

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("NE supprime PAS sur swipe DROITE même très loin (+300px) — pas de fallback bidirectionnel", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: 300, y: 0 }, velocity: { x: 0, y: 0 } });

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("NE supprime PAS sur swipe gauche en-deçà du seuil (-50px)", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -50, y: 0 }, velocity: { x: 0, y: 0 } });

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("supprime à exactement -81px (juste au-delà du seuil)", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -81, y: 0 }, velocity: { x: 0, y: 0 } });

		expect(onRemove).toHaveBeenCalledWith("color", "red");
	});

	it("NE supprime PAS à exactement -80px (seuil strict)", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -80, y: 0 }, velocity: { x: 0, y: 0 } });

		expect(onRemove).not.toHaveBeenCalled();
	});
	// ========================================================================
	// FLICK — distance + vélocité (extension 2026-08-05, gauche uniquement)
	// ========================================================================

	it("supprime sur FLICK gauche court mais vif (-50px, -600px/s)", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.(
			{},
			{ offset: { x: -50, y: 0 }, velocity: { x: -600, y: 0 } },
		);

		expect(onRemove).toHaveBeenCalledWith("color", "red");
	});

	it("NE supprime PAS un geste court et lent (-50px, -300px/s)", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.(
			{},
			{ offset: { x: -50, y: 0 }, velocity: { x: -300, y: 0 } },
		);

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("NE supprime PAS un micro-geste même très vif (-20px, -900px/s) — plancher de distance", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.(
			{},
			{ offset: { x: -20, y: 0 }, velocity: { x: -900, y: 0 } },
		);

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("NE supprime PAS sur FLICK DROIT (+50px, +900px/s) — la convention reste gauche-only", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);

		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: 50, y: 0 }, velocity: { x: 900, y: 0 } });

		expect(onRemove).not.toHaveBeenCalled();
	});
});
