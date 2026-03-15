import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion, mockIsMobile } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
	mockIsMobile: { value: false },
}));

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
						whileHover: _wh,
						drag: _d,
						dragConstraints: _dc,
						dragElastic: _de,
						onDragEnd: _ode,
						style: _s,
						variants: _v,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
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

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockIsMobile.value,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	X: ({ className, ...props }: Record<string, unknown>) => {
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
		mockIsMobile.value = false;
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

	it("has correct aria-label for removal", () => {
		render(<FilterBadge filter={baseFilter} onRemove={vi.fn()} />);
		expect(screen.getByRole("button")).toHaveAttribute(
			"aria-label",
			"Supprimer le filtre Couleur Rouge",
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
});
