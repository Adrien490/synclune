import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false as boolean | null },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { createElement, Fragment } = require("react");
	return {
		AnimatePresence: ({ children }: { children: React.ReactNode }) =>
			createElement(Fragment, null, children),
		m: {
			svg: ({
				children,
				initial: _i,
				animate: _a,
				exit: _e,
				transition: _t,
				onAnimationComplete: _o,
				style,
				...props
			}: Record<string, unknown> & { children?: React.ReactNode }) =>
				createElement(
					"svg",
					{ ...props, style: style as Record<string, unknown> | undefined },
					children,
				),
		},
		useReducedMotion: () => mockReducedMotion.value,
	};
});

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FlyHeartToBadgeLayer } from "../fly-heart-to-badge";
import {
	FLY_HEART_EVENT,
	WISHLIST_BADGE_DATA_ATTR,
	type FlyHeartEventDetail,
} from "../fly-heart-to-badge.constants";

// ============================================================================
// HELPERS
// ============================================================================

function dispatchFly(detail: FlyHeartEventDetail) {
	fireEvent(window, new CustomEvent(FLY_HEART_EVENT, { detail }));
}

function mountBadgeTarget() {
	const el = document.createElement("div");
	el.setAttribute(WISHLIST_BADGE_DATA_ATTR, "");
	el.getBoundingClientRect = () =>
		({
			top: 20,
			left: 1000,
			width: 8,
			height: 8,
			right: 1008,
			bottom: 28,
			x: 1000,
			y: 20,
		}) as DOMRect;
	document.body.appendChild(el);
	return () => {
		if (el.parentNode) el.parentNode.removeChild(el);
	};
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	mockReducedMotion.value = false;
});

describe("FlyHeartToBadgeLayer", () => {
	let removeBadgeTarget: () => void;

	beforeEach(() => {
		removeBadgeTarget = mountBadgeTarget();
	});

	afterEach(() => {
		removeBadgeTarget();
	});

	it("renders nothing initially", () => {
		const { container } = render(<FlyHeartToBadgeLayer />);
		expect(container.querySelector("svg")).toBeNull();
	});

	it("renders a mini-heart svg when fly event is dispatched", () => {
		const { container } = render(<FlyHeartToBadgeLayer />);

		dispatchFly({ fromRect: { top: 500, left: 300, width: 56, height: 56 } });

		expect(container.querySelector("svg")).not.toBeNull();
	});

	it("returns null and ignores events when prefers-reduced-motion is true", () => {
		mockReducedMotion.value = true;
		const { container } = render(<FlyHeartToBadgeLayer />);

		dispatchFly({ fromRect: { top: 500, left: 300, width: 56, height: 56 } });

		expect(container.firstChild).toBeNull();
	});

	it("silently ignores events when no badge target is mounted", () => {
		removeBadgeTarget();
		const { container } = render(<FlyHeartToBadgeLayer />);

		dispatchFly({ fromRect: { top: 500, left: 300, width: 56, height: 56 } });

		expect(container.querySelector("svg")).toBeNull();
	});

	it("caps concurrent hearts to MAX_CONCURRENT_HEARTS (4)", () => {
		const { container } = render(<FlyHeartToBadgeLayer />);

		for (let i = 0; i < 10; i += 1) {
			dispatchFly({ fromRect: { top: 500, left: 300 + i, width: 56, height: 56 } });
		}

		expect(container.querySelectorAll("svg").length).toBeLessThanOrEqual(4);
	});
});
