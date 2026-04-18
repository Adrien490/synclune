import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockHaptic } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

import { LatestCreationsHapticBridge } from "../latest-creations-haptic-bridge";

afterEach(cleanup);

describe("LatestCreationsHapticBridge", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fires light haptic on pointer down inside a card target", () => {
		render(
			<LatestCreationsHapticBridge>
				<div data-latest-haptic="card" data-testid="card">
					<span>Open</span>
				</div>
			</LatestCreationsHapticBridge>,
		);
		fireEvent.pointerDown(screen.getByTestId("card"));
		expect(mockHaptic).toHaveBeenCalledWith("light");
		expect(mockHaptic).toHaveBeenCalledTimes(1);
	});

	it("ignores pointer down on elements without data-latest-haptic", () => {
		render(
			<LatestCreationsHapticBridge>
				<div data-testid="no-attr">Not tracked</div>
			</LatestCreationsHapticBridge>,
		);
		fireEvent.pointerDown(screen.getByTestId("no-attr"));
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("ignores unknown haptic target value", () => {
		render(
			<LatestCreationsHapticBridge>
				<div data-latest-haptic="unknown" data-testid="unknown">
					Unknown
				</div>
			</LatestCreationsHapticBridge>,
		);
		fireEvent.pointerDown(screen.getByTestId("unknown"));
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("fires haptic when tapping a nested child of a card target", () => {
		render(
			<LatestCreationsHapticBridge>
				<div data-latest-haptic="card">
					<span>
						<button type="button" data-testid="deep">
							Deep
						</button>
					</span>
				</div>
			</LatestCreationsHapticBridge>,
		);
		fireEvent.pointerDown(screen.getByTestId("deep"));
		expect(mockHaptic).toHaveBeenCalledWith("light");
	});
});
