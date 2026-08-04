import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react/ssr", () => ({
	ClockIcon: ({ className }: { className?: string }) => (
		<span data-testid="clock-icon" className={className} />
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		role,
		"aria-label": ariaLabel,
		"aria-live": ariaLive,
	}: {
		children: React.ReactNode;
		role?: string;
		"aria-label"?: string;
		"aria-live"?: "polite" | "off" | "assertive";
	}) => (
		<span role={role} aria-label={ariaLabel} aria-live={ariaLive} data-testid="badge">
			{children}
		</span>
	),
}));

import { DiscountCountdown } from "../discount-countdown";

describe("DiscountCountdown", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-04-17T10:00:00.000Z"));
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders nothing when endDate is null", () => {
		const { container } = render(<DiscountCountdown endDate={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when endDate is undefined", () => {
		const { container } = render(<DiscountCountdown endDate={undefined} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when endDate is in the past (expired)", () => {
		const { container } = render(
			<DiscountCountdown endDate={new Date("2026-04-16T23:00:00.000Z")} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when more than maxDaysToShow days remain (default 7)", () => {
		// 10 days from now > 7-day default
		const { container } = render(
			<DiscountCountdown endDate={new Date("2026-04-27T10:00:00.000Z")} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders hours + minutes format for same-day offers", () => {
		// 3h 30min from now
		render(<DiscountCountdown endDate={new Date("2026-04-17T13:30:00.000Z")} />);
		expect(screen.getByTestId("badge").textContent).toMatch(/3h 30min/);
	});

	it("renders days-only format for multi-day offers", () => {
		// 2 days from now
		render(<DiscountCountdown endDate={new Date("2026-04-19T10:00:00.000Z")} />);
		expect(screen.getByTestId("badge").textContent).toMatch(/2 jours/);
	});

	it("sets role=timer with aria-live=off for non-interrupting announcements", () => {
		render(<DiscountCountdown endDate={new Date("2026-04-17T12:00:00.000Z")} />);
		const badge = screen.getByTestId("badge");
		expect(badge).toHaveAttribute("role", "timer");
		expect(badge).toHaveAttribute("aria-live", "off");
	});

	it("sets a descriptive aria-label", () => {
		render(<DiscountCountdown endDate={new Date("2026-04-17T12:30:00.000Z")} />);
		const badge = screen.getByTestId("badge");
		expect(badge.getAttribute("aria-label")).toMatch(/fin de l'offre dans/i);
	});

	it("respects a custom maxDaysToShow threshold", () => {
		// 5 days from now → hidden with maxDaysToShow=3
		const { container } = render(
			<DiscountCountdown endDate={new Date("2026-04-22T10:00:00.000Z")} maxDaysToShow={3} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders the Clock icon", () => {
		render(<DiscountCountdown endDate={new Date("2026-04-17T12:00:00.000Z")} />);
		expect(screen.getByTestId("clock-icon")).toBeInTheDocument();
	});
});
