import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockReducedMotion } = vi.hoisted(() => ({
	mockReducedMotion: { value: false },
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => ({
	useReducedMotion: () => mockReducedMotion.value,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock CSS import - the source uses "./decorative-halo.css" relative import
vi.mock("../decorative-halo.css", () => ({}));

// ============================================================================
// IMPORT UNDER TEST
// ============================================================================

import { DecorativeHalo, DecorativeHaloGroup } from "../decorative-halo";

describe("DecorativeHalo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it("renders with aria-hidden=true", () => {
		const { container } = render(<DecorativeHalo />);
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
	});

	it('size="lg" applies w-12 h-12 class', () => {
		const { container } = render(<DecorativeHalo size="lg" />);
		const classes = (container.firstChild as HTMLElement).className;
		expect(classes).toContain("w-12 h-12");
	});

	it('variant="rose" applies bg-[color:var(--rose-300)] class', () => {
		const { container } = render(<DecorativeHalo variant="rose" />);
		const classes = (container.firstChild as HTMLElement).className;
		expect(classes).toContain("bg-[color:var(--rose-300)]");
	});

	it('position="top-right" applies -top-4 -right-4 class', () => {
		const { container } = render(<DecorativeHalo position="top-right" />);
		const classes = (container.firstChild as HTMLElement).className;
		expect(classes).toContain("-top-4 -right-4");
	});

	it('animate="float" applies animate-float class', () => {
		const { container } = render(<DecorativeHalo animate="float" />);
		const classes = (container.firstChild as HTMLElement).className;
		expect(classes).toContain("animate-float");
	});

	it("reduced motion removes animation class", () => {
		mockReducedMotion.value = true;
		const { container } = render(<DecorativeHalo animate="float" />);
		const classes = (container.firstChild as HTMLElement).className;
		expect(classes).not.toContain("animate-float");
	});

	it("animationDelay sets style.animationDelay", () => {
		const { container } = render(<DecorativeHalo animationDelay={2} />);
		const el = container.firstChild as HTMLElement;
		expect(el.style.animationDelay).toBe("2s");
	});

	it("animationDelay + reduced motion does not set style", () => {
		mockReducedMotion.value = true;
		const { container } = render(<DecorativeHalo animationDelay={2} />);
		const el = container.firstChild as HTMLElement;
		expect(el.style.animationDelay).toBe("");
	});
});

describe("DecorativeHaloGroup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReducedMotion.value = false;
	});

	afterEach(cleanup);

	it('density="light" renders 2 halos', () => {
		const { container } = render(<DecorativeHaloGroup density="light" />);
		const halos = container.firstChild!.childNodes;
		expect(halos).toHaveLength(2);
	});

	it('density="medium" renders 3 halos', () => {
		const { container } = render(<DecorativeHaloGroup density="medium" />);
		const halos = container.firstChild!.childNodes;
		expect(halos).toHaveLength(3);
	});

	it('density="heavy" renders 4 halos', () => {
		const { container } = render(<DecorativeHaloGroup density="heavy" />);
		const halos = container.firstChild!.childNodes;
		expect(halos).toHaveLength(4);
	});

	it("container has aria-hidden=true", () => {
		const { container } = render(<DecorativeHaloGroup />);
		expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
	});
});
