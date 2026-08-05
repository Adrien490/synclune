import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockIsTouchDevice, lastMotionProps, mockTriggerHaptic } = vi.hoisted(
	() => ({
		mockReducedMotion: { value: false as boolean | null },
		mockIsTouchDevice: { value: false },
		lastMotionProps: {
			value: null as {
				drag?: unknown;
				onDragStart?: () => void;
				onDragEnd?: (
					event: unknown,
					info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
				) => void;
				whileHover?: unknown;
				style?: Record<string, unknown>;
			} | null,
		},
		mockTriggerHaptic: vi.fn(),
	}),
);

// ============================================================================
// MODULE MOCKS
// ============================================================================

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
						whileHover,
						drag,
						dragConstraints: _dc,
						dragElastic: _de,
						onDragStart,
						onDragEnd,
						style,
						variants: _v,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					lastMotionProps.value = {
						drag,
						onDragStart: onDragStart as never,
						onDragEnd: onDragEnd as never,
						whileHover,
						style: style as Record<string, unknown> | undefined,
					};
					const { createElement } = require("react");
					return createElement("button", { ref, ...props }, children);
				},
			),
			span: fRef(
				(
					{
						children,
						initial: _i,
						variants: _v,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("span", { ref, ...props }, children);
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
	triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	XIcon: ({ className, ...props }: Record<string, unknown>) => {
		const { createElement } = require("react");
		return createElement("svg", { className, "data-testid": "x-icon", ...props });
	},
}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { FilterBadge } from "../filter-badge";
import type { FilterDefinition } from "@/shared/hooks/use-filter";

describe("FilterBadge", () => {
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
		mockIsTouchDevice.value = false;
		lastMotionProps.value = null;
	});

	afterEach(cleanup);

	it("renders label only when no displayValue", () => {
		const filter = { ...baseFilter, displayValue: undefined };
		render(<FilterBadge filter={filter} onRemove={vi.fn()} />);
		expect(screen.getByText("Couleur")).toBeInTheDocument();
	});

	it('renders "Label : Value" when displayValue is present', () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(screen.getByText("Couleur :")).toBeInTheDocument();
		expect(screen.getByText("Rouge")).toBeInTheDocument();
	});

	it("has correct aria-label for removal (contains the visible « Label : Valeur » — WCAG 2.5.3)", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"Supprimer le filtre Couleur : Rouge",
		);
	});

	it("calls onRemove(key, value) for string value", () => {
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		fireEvent.click(screen.getByRole("button"));
		expect(onRemove).toHaveBeenCalledWith("color", "red");
	});

	it("calls onRemove(key, String(value)) for number value", () => {
		const onRemove = vi.fn();
		const filter = { ...baseFilter, value: 42 };
		render(<FilterBadge filter={filter} onRemove={onRemove} />);
		fireEvent.click(screen.getByRole("button"));
		expect(onRemove).toHaveBeenCalledWith("color", "42");
	});

	it("calls onRemove(key, String(value)) for boolean value", () => {
		const onRemove = vi.fn();
		const filter = { ...baseFilter, value: true };
		render(<FilterBadge filter={filter} onRemove={onRemove} />);
		fireEvent.click(screen.getByRole("button"));
		expect(onRemove).toHaveBeenCalledWith("color", "true");
	});

	it("calls onRemove(key, date.toISOString()) for Date value", () => {
		const onRemove = vi.fn();
		const date = new Date("2026-01-15T00:00:00.000Z");
		const filter = { ...baseFilter, value: date };
		render(<FilterBadge filter={filter} onRemove={onRemove} />);
		fireEvent.click(screen.getByRole("button"));
		expect(onRemove).toHaveBeenCalledWith("color", date.toISOString());
	});

	it("returns null when formatFilter returns null", () => {
		const { container } = render(
			<FilterBadge filter={baseFilter} formatFilter={() => null} onRemove={vi.fn()} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("uses formatFilter override for label and displayValue", () => {
		render(
			<FilterBadge
				filter={baseFilter}
				formatFilter={() => ({ label: "Custom Label", displayValue: "Custom Value" })}
				onRemove={vi.fn()}
			/>,
		);
		expect(screen.getByText("Custom Label :")).toBeInTheDocument();
		expect(screen.getByText("Custom Value")).toBeInTheDocument();
	});

	it("uses filter.label/displayValue when formatFilter is not provided", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(screen.getByText("Couleur :")).toBeInTheDocument();
		expect(screen.getByText("Rouge")).toBeInTheDocument();
	});

	it("X icon has aria-hidden=true", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		const iconSpan = screen.getByTestId("x-icon").closest("[aria-hidden]");
		expect(iconSpan).toHaveAttribute("aria-hidden", "true");
	});

	// ========================================================================
	// HAPTIC
	// ========================================================================

	it('triggers "selection" haptic on click (aligned with filter-sections pattern)', () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		fireEvent.click(screen.getByRole("button"));
		expect(mockTriggerHaptic).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	// ========================================================================
	// DRAG (touch devices only)
	// ========================================================================

	it("disables drag on non-touch devices (desktop mouse)", () => {
		mockIsTouchDevice.value = false;
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(lastMotionProps.value?.drag).toBe(false);
	});

	it("enables drag=x on touch devices", () => {
		mockIsTouchDevice.value = true;
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(lastMotionProps.value?.drag).toBe("x");
	});

	it("disables drag when user prefers reduced motion (even on touch)", () => {
		mockIsTouchDevice.value = true;
		mockReducedMotion.value = true;
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(lastMotionProps.value?.drag).toBe(false);
	});

	it("calls onRemove when left swipe exceeds 80px threshold", () => {
		mockIsTouchDevice.value = true;
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -120, y: 0 }, velocity: { x: 0, y: 0 } });
		expect(onRemove).toHaveBeenCalledWith("color", "red");
		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	it("does not call onRemove when swipe is below threshold (left)", () => {
		mockIsTouchDevice.value = true;
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -50, y: 0 }, velocity: { x: 0, y: 0 } });
		expect(onRemove).not.toHaveBeenCalled();
		expect(mockTriggerHaptic).not.toHaveBeenCalled();
	});

	// ========================================================================
	// AFFORDANCE — X icon opacity (CSS-only, no Motion variants)
	// ========================================================================

	it("X icon container exposes touch-first opacity classes (opacity-100 mobile, sm:opacity-60 desktop)", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		const iconContainer = screen.getByTestId("x-icon").closest("[aria-hidden]");
		expect(iconContainer?.className).toContain("opacity-100");
		expect(iconContainer?.className).toContain("sm:opacity-60");
		expect(iconContainer?.className).toContain("can-hover:group-hover:opacity-100");
	});

	it("button is the hover group anchor (group class present)", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("group");
	});

	// ========================================================================
	// FOCUS RING — SSOT alignment (app/globals.css @utility focus-ring)
	// ========================================================================

	it("uses the shared focus-ring utility (SSOT)", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("focus-ring");
	});

	// ========================================================================
	// APPEARANCE — pilule (défaut, admin) vs « étiquette de bocal » (storefront)
	// ========================================================================

	it("renders the neutral pill by default (rounded-full, no facet liseré)", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("rounded-full");
		expect(button.className).not.toContain("border-l-3");
	});

	it("renders the etiquette appearance with its accentClassName (liseré + lavis de facette)", () => {
		render(
			<FilterBadge
				filter={baseFilter}
				onRemove={vi.fn()}
				appearance="etiquette"
				accentClassName="border-l-brand-lavender bg-brand-lavender/10 focus-visible:border-l-brand-lavender"
			/>,
		);
		const button = screen.getByRole("button");
		expect(button.className).toContain("rounded-sm");
		expect(button.className).toContain("border-l-3");
		expect(button.className).toContain("border-l-brand-lavender");
		expect(button.className).toContain("bg-brand-lavender/10");
		// Parité focus du liseré : l'utilitaire focus-ring recolore les 4 bordures,
		// l'accent doit se ré-affirmer côté gauche (ré-audit 2026-08-05).
		expect(button.className).toContain("focus-visible:border-l-brand-lavender");
		expect(button.className).not.toContain("rounded-full");
	});

	it("etiquette without accentClassName still renders the base etiquette shell", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} appearance="etiquette" />);
		const button = screen.getByRole("button");
		expect(button.className).toContain("rounded-sm");
		expect(button.className).toContain("bg-card");
	});

	// ========================================================================
	// DOUBLE-FIRE GUARD — un drag souris (hybride iPad+trackpad) émet un click
	// natif au relâchement ; Motion ne supprime que son geste press, pas onClick.
	// ========================================================================

	it("swallows the native click that follows a dismissing drag (single onRemove)", () => {
		mockIsTouchDevice.value = true;
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		const button = screen.getByRole("button");

		fireEvent.pointerDown(button);
		lastMotionProps.value?.onDragStart?.();
		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -120, y: 0 }, velocity: { x: 0, y: 0 } });
		fireEvent.click(button, { detail: 1 });

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it("swallows the native click after an aborted drag (below threshold — a drag is not a tap)", () => {
		mockIsTouchDevice.value = true;
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		const button = screen.getByRole("button");

		fireEvent.pointerDown(button);
		lastMotionProps.value?.onDragStart?.();
		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -50, y: 0 }, velocity: { x: 0, y: 0 } });
		fireEvent.click(button, { detail: 1 });

		expect(onRemove).not.toHaveBeenCalled();
	});

	it("does NOT swallow a keyboard activation (detail === 0) even after an aborted drag", () => {
		mockIsTouchDevice.value = true;
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		const button = screen.getByRole("button");

		fireEvent.pointerDown(button);
		lastMotionProps.value?.onDragStart?.();
		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -50, y: 0 }, velocity: { x: 0, y: 0 } });
		// Entrée/Espace produisent un click avec detail=0 — jamais précédé d'un drag.
		fireEvent.click(button, { detail: 0 });

		expect(onRemove).toHaveBeenCalledTimes(1);
	});

	it("a fresh tap after an aborted drag removes normally (pointerdown resets the guard)", () => {
		mockIsTouchDevice.value = true;
		const onRemove = vi.fn();
		render(<FilterBadge filter={baseFilter} onRemove={onRemove} />);
		const button = screen.getByRole("button");

		fireEvent.pointerDown(button);
		lastMotionProps.value?.onDragStart?.();
		lastMotionProps.value?.onDragEnd?.({}, { offset: { x: -50, y: 0 }, velocity: { x: 0, y: 0 } });
		// Nouveau geste : pointerdown ré-arme, pas de drag cette fois.
		fireEvent.pointerDown(button);
		fireEvent.click(button, { detail: 1 });

		expect(onRemove).toHaveBeenCalledTimes(1);
	});
});
