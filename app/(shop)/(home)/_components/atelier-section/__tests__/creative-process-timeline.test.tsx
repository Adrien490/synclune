import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/constants/process-steps", () => ({
	STEP_COLORS: {
		primary: "border-primary bg-primary/10 text-primary",
		secondary: "border-secondary bg-secondary/10 text-secondary",
	},
}));

vi.mock("lucide-react", () => ({
	Sparkles: () => <svg data-testid="icon-sparkles" aria-hidden="true" />,
}));

vi.mock("@/shared/components/animations/glitter-sparkles", () => ({
	GlitterSparkles: () => <div data-testid="glitter-sparkles" />,
}));

vi.mock("../step-illustrations", () => ({
	STEP_ILLUSTRATIONS: {
		idea: () => <svg data-testid="illustration-idea" aria-hidden="true" />,
		drawing: () => <svg data-testid="illustration-drawing" aria-hidden="true" />,
		assembly: () => <svg data-testid="illustration-assembly" aria-hidden="true" />,
		finishing: () => <svg data-testid="illustration-finishing" aria-hidden="true" />,
	},
}));

// ---------------------------------------------------------------------------

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreativeProcessTimeline", () => {
	let CreativeProcessTimeline: React.ComponentType;

	beforeAll(async () => {
		({ CreativeProcessTimeline } = await import("../creative-process-timeline"));
	});

	it("renders both desktop and mobile timeline wrappers", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const desktopWrapper = container.querySelector(".hidden.lg\\:block");
		expect(desktopWrapper).not.toBeNull();

		const mobileWrapper = container.querySelector(".lg\\:hidden");
		expect(mobileWrapper).not.toBeNull();
	});

	it("renders desktop ordered list with correct aria-label", () => {
		render(<CreativeProcessTimeline />);

		const lists = screen.getAllByRole("list");
		const labelledLists = lists.filter(
			(el) => el.getAttribute("aria-label") === "Processus de création en 4 étapes",
		);
		// One desktop + one mobile
		expect(labelledLists).toHaveLength(2);
	});

	it("renders 4 steps in the desktop timeline", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const desktopList = container.querySelector(".hidden.lg\\:block ol");
		expect(desktopList).not.toBeNull();
		const items = desktopList!.querySelectorAll("li");
		expect(items).toHaveLength(4);
	});

	it("renders 4 steps in the mobile timeline", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const mobileList = container.querySelector(".lg\\:hidden ol");
		expect(mobileList).not.toBeNull();
		const items = mobileList!.querySelectorAll("li");
		expect(items).toHaveLength(4);
	});

	it("each desktop step has correct id and aria-describedby", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const stepIds = ["idea", "drawing", "assembly", "finishing"];
		const desktopList = container.querySelector(".hidden.lg\\:block ol");

		for (const id of stepIds) {
			const li = desktopList!.querySelector(`[id="creative-step-${id}"]`);
			expect(li).not.toBeNull();
			expect(li!.getAttribute("aria-describedby")).toBe(`creative-step-${id}-desc`);
		}
	});

	it("each desktop step has tabIndex=0 for keyboard navigation", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const desktopList = container.querySelector(".hidden.lg\\:block ol");
		const items = desktopList!.querySelectorAll("li");

		items.forEach((li) => {
			expect(li.getAttribute("tabindex")).toBe("0");
		});
	});

	it("renders sr-only step labels for screen readers", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const desktopList = container.querySelector(".hidden.lg\\:block ol");
		const srLabels = desktopList!.querySelectorAll(".sr-only");
		expect(srLabels).toHaveLength(4);

		const texts = Array.from(srLabels).map((el) => el.textContent);
		expect(texts).toContain("Étape 1 :");
		expect(texts).toContain("Étape 2 :");
		expect(texts).toContain("Étape 3 :");
		expect(texts).toContain("Étape 4 :");
	});

	it("renders all step titles", () => {
		render(<CreativeProcessTimeline />);

		// Titles appear in both desktop and mobile
		expect(screen.getAllByText("D'abord, une idée").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Le dessin et la peinture").length).toBeGreaterThan(0);
		expect(screen.getAllByText("La cuisson et l'assemblage").length).toBeGreaterThan(0);
		expect(screen.getAllByText("La touche finale").length).toBeGreaterThan(0);
	});

	it("renders description paragraphs with matching ids", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const stepIds = ["idea", "drawing", "assembly", "finishing"];
		const desktopList = container.querySelector(".hidden.lg\\:block ol");
		for (const id of stepIds) {
			const desc = desktopList!.querySelector(`[id="creative-step-${id}-desc"]`);
			expect(desc).not.toBeNull();
			expect(desc!.tagName.toLowerCase()).toBe("p");
		}
	});

	it("renders GlitterSparkles only on the last step (desktop)", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const desktopList = container.querySelector(".hidden.lg\\:block ol");
		const sparkles = desktopList!.querySelectorAll("[data-testid='glitter-sparkles']");
		expect(sparkles).toHaveLength(1);

		const items = desktopList!.querySelectorAll("li");
		const lastItem = items[items.length - 1]!;
		expect(lastItem.querySelector("[data-testid='glitter-sparkles']")).not.toBeNull();
	});

	it("each mobile step has correct id attributes", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const stepIds = ["idea", "drawing", "assembly", "finishing"];
		const mobileList = container.querySelector(".lg\\:hidden ol");

		for (const id of stepIds) {
			// Use attribute selector instead of ID selector to avoid document-level ID lookup
			const li = mobileList!.querySelector(`[id="creative-step-${id}"]`);
			expect(li).not.toBeNull();
		}
	});

	it("mobile number circles show step numbers 1 through 4", () => {
		const { container } = render(<CreativeProcessTimeline />);

		const mobileList = container.querySelector(".lg\\:hidden ol");
		const numberCircles = mobileList!.querySelectorAll(".mobile-step-scroll");

		expect(numberCircles).toHaveLength(4);
		const numbers = Array.from(numberCircles).map((el) => el.textContent);
		expect(numbers).toEqual(["1", "2", "3", "4"]);
	});
});
