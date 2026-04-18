import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockHaptic } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/animations", () => ({
	Stagger: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		stagger?: number;
		y?: number;
		inView?: boolean;
		once?: boolean;
		className?: string;
	}) => (
		<div data-testid="stagger" className={className}>
			{children}
		</div>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		stagger: { normal: 0.05 },
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/components/ui/accordion", () => ({
	Accordion: ({
		children,
		type,
		collapsible: _collapsible,
		value,
		onValueChange,
		className,
	}: {
		children: React.ReactNode;
		type?: string;
		collapsible?: boolean;
		value?: string;
		onValueChange?: (value: string) => void;
		className?: string;
	}) => (
		<div
			data-testid="accordion"
			data-type={type}
			data-value={value}
			className={className}
			role="presentation"
			onClick={(e) => {
				const target = e.target as HTMLElement;
				const item = target.closest<HTMLElement>("[data-accordion-value]");
				if (item && onValueChange) {
					const clickedValue = item.dataset.accordionValue ?? "";
					onValueChange(clickedValue === value ? "" : clickedValue);
				}
			}}
			onKeyDown={() => {}}
		>
			{children}
		</div>
	),
	AccordionItem: ({
		children,
		value,
		className,
	}: {
		children: React.ReactNode;
		value: string;
		className?: string;
	}) => (
		<div data-testid={`accordion-item-${value}`} data-accordion-value={value} className={className}>
			{children}
		</div>
	),
	AccordionTrigger: ({
		children,
		className,
		headingLevel: _headingLevel,
	}: {
		children: React.ReactNode;
		className?: string;
		headingLevel?: number;
	}) => (
		<button data-testid="accordion-trigger" className={className}>
			{children}
		</button>
	),
	AccordionContent: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div data-testid="accordion-content" className={className}>
			{children}
		</div>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FaqAccordion } from "../faq-accordion";

afterEach(cleanup);

// ============================================================================
// HELPERS
// ============================================================================

function createFaqItems(count: number) {
	return Array.from({ length: count }, (_, i) => ({
		question: `Question ${i + 1}`,
		answer: `Answer ${i + 1}`,
	}));
}

// ============================================================================
// TESTS
// ============================================================================

describe("FaqAccordion", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders without crashing with empty items", () => {
		expect(() => render(<FaqAccordion items={[]} />)).not.toThrow();
	});

	it("renders an Accordion container", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		expect(screen.getByTestId("accordion")).toBeInTheDocument();
	});

	it("renders a Stagger wrapper", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		expect(screen.getByTestId("stagger")).toBeInTheDocument();
	});

	// ─── Items ────────────────────────────────────────────────────────────────

	it("renders an AccordionItem for each FAQ item", () => {
		render(<FaqAccordion items={createFaqItems(3)} />);
		expect(screen.getByTestId("accordion-item-Question 1")).toBeInTheDocument();
		expect(screen.getByTestId("accordion-item-Question 2")).toBeInTheDocument();
		expect(screen.getByTestId("accordion-item-Question 3")).toBeInTheDocument();
	});

	it("renders question text in AccordionTrigger", () => {
		render(<FaqAccordion items={[{ question: "Comment livrez-vous ?", answer: "En 3 jours." }]} />);
		expect(screen.getByText("Comment livrez-vous ?")).toBeInTheDocument();
	});

	it("renders answer text in AccordionContent", () => {
		render(<FaqAccordion items={[{ question: "FAQ question", answer: "FAQ answer" }]} />);
		expect(screen.getByText("FAQ answer")).toBeInTheDocument();
	});

	// ─── ReactNode answers ────────────────────────────────────────────────────

	it("renders ReactNode answers (links)", () => {
		const items = [
			{
				question: "Voir nos produits ?",
				answer: <a href="/boutique">boutique</a>,
			},
		];
		render(<FaqAccordion items={items} />);
		expect(screen.getByRole("link", { name: "boutique" })).toBeInTheDocument();
	});

	// ─── Multiple items ───────────────────────────────────────────────────────

	it("renders all 6 items correctly", () => {
		render(<FaqAccordion items={createFaqItems(6)} />);
		for (let i = 1; i <= 6; i++) {
			expect(screen.getByText(`Question ${i}`)).toBeInTheDocument();
		}
	});

	// ─── Key usage ────────────────────────────────────────────────────────────

	it("uses question as the AccordionItem value/key", () => {
		render(<FaqAccordion items={[{ question: "Unique question text", answer: "Answer" }]} />);
		expect(screen.getByTestId("accordion-item-Unique question text")).toBeInTheDocument();
	});

	// ─── Haptic + a11y ────────────────────────────────────────────────────────

	it("fires haptic selection on open", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		const item = screen.getByTestId("accordion-item-Question 1");
		fireEvent.click(item);
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("fires haptic on close (value back to empty)", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		const item = screen.getByTestId("accordion-item-Question 2");
		fireEvent.click(item);
		fireEvent.click(item);
		expect(mockHaptic).toHaveBeenCalledTimes(2);
	});

	it("renders a sr-only aria-live region for opened question", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		const liveRegion = screen.getByRole("status");
		expect(liveRegion).toHaveAttribute("aria-live", "polite");
		expect(liveRegion).toHaveAttribute("aria-atomic", "true");
		expect(liveRegion).toHaveClass("sr-only");
	});

	it("announces opened question text in live region", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		const item = screen.getByTestId("accordion-item-Question 1");
		fireEvent.click(item);
		expect(screen.getByRole("status")).toHaveTextContent("Réponse affichée : Question 1");
	});

	it("clears the live region when the item is closed", () => {
		render(<FaqAccordion items={createFaqItems(2)} />);
		const item = screen.getByTestId("accordion-item-Question 1");
		fireEvent.click(item);
		fireEvent.click(item);
		expect(screen.getByRole("status").textContent).toBe("");
	});
});
