import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const triggerHaptic = vi.fn();

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => triggerHaptic,
}));

import { AtelierHapticBridge } from "../atelier-haptic-bridge";

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	triggerHaptic.mockReset();
});

describe("AtelierHapticBridge", () => {
	it("triggers 'light' haptic when a CTA element is pressed", () => {
		const { getByTestId } = render(
			<AtelierHapticBridge>
				<button data-testid="cta" data-atelier-haptic="cta">
					Créer
				</button>
			</AtelierHapticBridge>,
		);

		fireEvent.pointerDown(getByTestId("cta"));
		expect(triggerHaptic).toHaveBeenCalledExactlyOnceWith("light");
	});

	it("triggers 'selection' haptic on timeline step press", () => {
		const { getByTestId } = render(
			<AtelierHapticBridge>
				<li data-testid="step" data-atelier-haptic="step" />
			</AtelierHapticBridge>,
		);

		fireEvent.pointerDown(getByTestId("step"));
		expect(triggerHaptic).toHaveBeenCalledExactlyOnceWith("selection");
	});

	it("triggers 'light' haptic on polaroid press", () => {
		const { getByTestId } = render(
			<AtelierHapticBridge>
				<figure data-testid="polaroid" data-atelier-haptic="polaroid" />
			</AtelierHapticBridge>,
		);

		fireEvent.pointerDown(getByTestId("polaroid"));
		expect(triggerHaptic).toHaveBeenCalledExactlyOnceWith("light");
	});

	it("bubbles up: child element of a tagged parent also triggers haptic", () => {
		const { getByTestId } = render(
			<AtelierHapticBridge>
				<li data-atelier-haptic="step">
					<span data-testid="inner">Étape 1</span>
				</li>
			</AtelierHapticBridge>,
		);

		fireEvent.pointerDown(getByTestId("inner"));
		expect(triggerHaptic).toHaveBeenCalledExactlyOnceWith("selection");
	});

	it("does nothing when pressing an element without data-atelier-haptic", () => {
		const { getByTestId } = render(
			<AtelierHapticBridge>
				<p data-testid="no-tag">Plain text</p>
			</AtelierHapticBridge>,
		);

		fireEvent.pointerDown(getByTestId("no-tag"));
		expect(triggerHaptic).not.toHaveBeenCalled();
	});

	it("ignores unknown data-atelier-haptic values", () => {
		const { getByTestId } = render(
			<AtelierHapticBridge>
				<div data-testid="weird" data-atelier-haptic="something-else" />
			</AtelierHapticBridge>,
		);

		fireEvent.pointerDown(getByTestId("weird"));
		expect(triggerHaptic).not.toHaveBeenCalled();
	});
});
