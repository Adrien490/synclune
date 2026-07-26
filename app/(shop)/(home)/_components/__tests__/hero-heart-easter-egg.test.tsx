import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/animations/heart-burst", () => ({
	HeartBurst: ({ seed, scale }: { seed?: number; scale?: number }) => (
		<div data-testid="heart-burst" data-seed={seed} data-scale={scale} />
	),
}));

const triggerHaptic = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (pattern?: string) => triggerHaptic(pattern),
}));

import { HeroHeartEasterEgg } from "../hero-heart-easter-egg";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	vi.useRealTimers();
});

describe("HeroHeartEasterEgg", () => {
	it("bouton purement décoratif : aria-hidden + hors tab order", () => {
		render(<HeroHeartEasterEgg />);

		const button = document.querySelector("button")!;
		expect(button).toHaveAttribute("aria-hidden", "true");
		expect(button).toHaveAttribute("tabindex", "-1");
		expect(button).toHaveAttribute("type", "button");
	});

	it("aucun burst au montage", () => {
		render(<HeroHeartEasterEgg />);

		expect(screen.queryByTestId("heart-burst")).not.toBeInTheDocument();
	});

	it("clic → burst + haptic léger", () => {
		render(<HeroHeartEasterEgg />);

		fireEvent.click(document.querySelector("button")!);

		expect(screen.getByTestId("heart-burst")).toBeInTheDocument();
		expect(triggerHaptic).toHaveBeenCalledWith("light");
	});

	it("cooldown : un second clic < 600ms ne redéclenche pas (anti-spam)", () => {
		render(<HeroHeartEasterEgg />);
		const button = document.querySelector("button")!;

		fireEvent.click(button);
		expect(triggerHaptic).toHaveBeenCalledTimes(1);
		const firstSeed = screen.getByTestId("heart-burst").getAttribute("data-seed");

		vi.advanceTimersByTime(200);
		fireEvent.click(button);
		expect(triggerHaptic).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId("heart-burst").getAttribute("data-seed")).toBe(firstSeed);
	});

	it("après le cooldown, un nouveau clic relance un burst (seed varié)", () => {
		render(<HeroHeartEasterEgg />);
		const button = document.querySelector("button")!;

		fireEvent.click(button);
		vi.advanceTimersByTime(700);
		fireEvent.click(button);

		expect(triggerHaptic).toHaveBeenCalledTimes(2);
		expect(screen.getByTestId("heart-burst").getAttribute("data-seed")).toBe("2");
	});
});
