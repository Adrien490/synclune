import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("lucide-react", () => ({
	ChevronDownIcon: ({
		className,
		"aria-hidden": ariaHidden,
	}: {
		className?: string;
		"aria-hidden"?: boolean | "true" | "false";
	}) => <svg data-testid="chevron-icon" className={className} aria-hidden={ariaHidden} />,
}));

// Import AFTER mocks
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../accordion";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderAccordion(headingLevel?: 2 | 3 | 4 | 5 | 6) {
	return render(
		<Accordion type="single" collapsible>
			<AccordionItem value="item-1">
				<AccordionTrigger headingLevel={headingLevel}>Question 1</AccordionTrigger>
				<AccordionContent>Answer 1</AccordionContent>
			</AccordionItem>
			<AccordionItem value="item-2">
				<AccordionTrigger>Question 2</AccordionTrigger>
				<AccordionContent>Answer 2</AccordionContent>
			</AccordionItem>
		</Accordion>,
	);
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("Accordion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders accordion items", () => {
		renderAccordion();
		expect(screen.getByText("Question 1")).toBeInTheDocument();
		expect(screen.getByText("Question 2")).toBeInTheDocument();
	});

	it("has data-slot=accordion", () => {
		const { container } = renderAccordion();
		expect(container.querySelector("[data-slot='accordion']")).toBeInTheDocument();
	});

	it("renders chevron icon inside trigger", () => {
		renderAccordion();
		const chevrons = screen.getAllByTestId("chevron-icon");
		expect(chevrons.length).toBeGreaterThan(0);
	});

	it("chevron icon has aria-hidden=true", () => {
		renderAccordion();
		const chevron = screen.getAllByTestId("chevron-icon")[0];
		expect(chevron).toHaveAttribute("aria-hidden", "true");
	});

	it("renders content elements in DOM (forceMount)", () => {
		renderAccordion();
		expect(screen.getByText("Answer 1")).toBeInTheDocument();
		expect(screen.getByText("Answer 2")).toBeInTheDocument();
	});
});

describe("AccordionTrigger with headingLevel", () => {
	it("wraps trigger in an h2 when headingLevel=2", () => {
		const { container } = renderAccordion(2);
		expect(container.querySelector("h2")).toBeInTheDocument();
	});

	it("wraps trigger in an h3 when headingLevel=3", () => {
		const { container } = renderAccordion(3);
		expect(container.querySelector("h3")).toBeInTheDocument();
	});

	it("does not render explicit heading wrapper when headingLevel is not set (Radix renders default header)", () => {
		const { container } = render(
			<Accordion type="single">
				<AccordionItem value="item-1">
					<AccordionTrigger>No heading</AccordionTrigger>
					<AccordionContent>Content</AccordionContent>
				</AccordionItem>
			</Accordion>,
		);
		// When headingLevel is not set, no h2/h4/h5/h6 are added by our component
		expect(container.querySelector("h2")).not.toBeInTheDocument();
		expect(container.querySelector("h4")).not.toBeInTheDocument();
		expect(container.querySelector("h5")).not.toBeInTheDocument();
	});
});

describe("AccordionItem", () => {
	it("has data-slot=accordion-item", () => {
		const { container } = renderAccordion();
		expect(container.querySelector("[data-slot='accordion-item']")).toBeInTheDocument();
	});
});

describe("AccordionContent", () => {
	it("has data-slot=accordion-content", () => {
		const { container } = renderAccordion();
		expect(container.querySelector("[data-slot='accordion-content']")).toBeInTheDocument();
	});
});
