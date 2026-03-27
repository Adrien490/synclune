import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	m: {
		div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
	},
	useMotionValue: (initial: number) => ({ get: () => initial, set: vi.fn() }),
	useTransform: () => ({ get: () => 0 }),
}));

vi.mock("./utils", () => ({
	buildRibbonGradient: () => "linear-gradient(90deg, #ff0, #f0f)",
	getRibbonAnimation: () => ({}),
	getRibbonTransition: () => ({}),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { AuroraRibbonSet, ribbonStyle } from "../aurora-ribbon-set";
import type { Ribbon } from "../types";

// ============================================================================
// FIXTURES
// ============================================================================

const mockRibbons: Ribbon[] = [
	{
		id: 1,
		width: 200,
		height: 100,
		x: 50,
		y: 30,
		blur: 40,
		depthFactor: 0.5,
		rotation: 45,
		scale: 1,
		opacity: 0.7,
		gradientAngle: 90,
		gradientColors: ["#ff0", "#f0f", "#0ff"],
		duration: 8,
		delay: 0,
	},
	{
		id: 2,
		width: 150,
		height: 80,
		x: 20,
		y: 60,
		blur: 30,
		depthFactor: 0.8,
		rotation: 30,
		scale: 0.9,
		opacity: 0.5,
		gradientAngle: 45,
		gradientColors: ["#0ff", "#00f", "#f00"],
		duration: 10,
		delay: 2,
	},
];

const baseProps = {
	blendMode: "screen" as const,
	intensity: "medium" as const,
};

// ============================================================================
// AuroraRibbonSet
// ============================================================================

describe("AuroraRibbonSet", () => {
	afterEach(cleanup);

	it("returns null when isInView is false", () => {
		const { container } = render(
			<AuroraRibbonSet
				{...baseProps}
				ribbons={mockRibbons}
				isInView={false}
				reducedMotion={false}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders ribbons when isInView and reducedMotion is true", () => {
		const { container } = render(
			<AuroraRibbonSet {...baseProps} ribbons={mockRibbons} isInView={true} reducedMotion={true} />,
		);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders ribbons when isInView and reducedMotion is false", () => {
		const { container } = render(
			<AuroraRibbonSet
				{...baseProps}
				ribbons={mockRibbons}
				isInView={true}
				reducedMotion={false}
			/>,
		);
		expect(container.firstChild).not.toBeNull();
	});

	it("renders correct number of ribbon elements for reducedMotion", () => {
		const { container } = render(
			<AuroraRibbonSet {...baseProps} ribbons={mockRibbons} isInView={true} reducedMotion={true} />,
		);
		// Each StaticRibbon renders a wrapper div + inner div, look for absolute-positioned wrappers
		const absoluteDivs = container.querySelectorAll(".absolute");
		expect(absoluteDivs.length).toBe(mockRibbons.length);
	});

	it("renders correct number of ribbon elements for animated mode", () => {
		const { container } = render(
			<AuroraRibbonSet
				{...baseProps}
				ribbons={mockRibbons}
				isInView={true}
				reducedMotion={false}
			/>,
		);
		// Each AnimatedRibbon renders 2 m.div wrappers (outer + inner), outer has class "absolute"
		const absoluteDivs = container.querySelectorAll(".absolute");
		expect(absoluteDivs.length).toBe(mockRibbons.length);
	});
});

// ============================================================================
// ribbonStyle
// ============================================================================

describe("ribbonStyle", () => {
	afterEach(cleanup);

	it("returns correct positioning and dimensions", () => {
		const ribbon = mockRibbons[0]!;
		const style = ribbonStyle(ribbon, "screen", false);

		expect(style.width).toBe(ribbon.width);
		expect(style.height).toBe(ribbon.height);
		expect(style.left).toBe(`${ribbon.x}%`);
		expect(style.top).toBe(`${ribbon.y}%`);
	});

	it("increases blur by 1.5x in highContrast mode", () => {
		const ribbon = mockRibbons[0]!;
		const normal = ribbonStyle(ribbon, "screen", false);
		const highContrast = ribbonStyle(ribbon, "screen", true);

		expect(highContrast.filter).toBe(`blur(${ribbon.blur * 1.5}px)`);
		expect(normal.filter).toBe(`blur(${ribbon.blur}px)`);
	});

	it("sets mixBlendMode from blendMode prop", () => {
		const style = ribbonStyle(mockRibbons[0]!, "soft-light", false);
		expect(style.mixBlendMode).toBe("soft-light");
	});

	it("calculates zIndex from depthFactor", () => {
		const ribbon = mockRibbons[0]!; // depthFactor: 0.5 → zIndex = round((1-0.5)*10) = 5
		const style = ribbonStyle(ribbon, "screen", false);
		expect(style.zIndex).toBe(Math.round((1 - ribbon.depthFactor) * 10));
	});
});
