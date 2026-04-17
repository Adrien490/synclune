import { cleanup, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Suspense } from "react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetFaqItems } = vi.hoisted(() => ({
	mockGetFaqItems: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/faq/data/get-faq-items", () => ({
	getFaqItems: mockGetFaqItems,
}));

vi.mock("@/modules/faq/components/faq-accordion", () => ({
	FaqAccordion: ({ items }: { items: { question: string; answer: React.ReactNode }[] }) => (
		<div data-testid="faq-accordion">
			{items.map((item, i) => (
				<div key={i} data-testid={`accordion-item-${i}`}>
					<span data-testid={`question-${i}`}>{item.question}</span>
					<div data-testid={`answer-${i}`}>{item.answer}</div>
				</div>
			))}
		</div>
	),
}));

vi.mock("@/modules/faq/components/faq-doodles", () => ({
	FaqDoodles: () => <div data-testid="faq-doodles" />,
}));

vi.mock("@/shared/components/animations", () => ({
	Fade: ({
		children,
	}: {
		children: React.ReactNode;
		y?: number;
		delay?: number;
		duration?: number;
		inView?: boolean;
		once?: boolean;
	}) => <>{children}</>,
	HandDrawnUnderline: ({
		color: _color,
		delay: _delay,
		className: _className,
	}: {
		color?: string;
		delay?: number;
		className?: string;
	}) => <span data-testid="hand-drawn-underline" />,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			subtitle: { y: 20, delay: 0.1, duration: 0.5 },
			cta: { y: 20, delay: 0.2, duration: 0.5 },
			underline: { delay: 0.15 },
		},
	},
}));

vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
		<h2 id={id} data-testid="section-title">
			{children}
		</h2>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		variant: _variant,
		size: _size,
		className: _className,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		variant?: string;
		size?: string;
		className?: string;
	}) => (asChild ? <>{children}</> : <button>{children}</button>),
}));

vi.mock("@/shared/constants/brand", () => ({
	BRAND: {
		contact: { email: "contact@synclune.fr" },
	},
}));

vi.mock("@/shared/constants/spacing", () => ({
	CONTAINER_CLASS: "container",
	SECTION_SPACING: { section: "py-16" },
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/utils/safe-json-ld", () => ({
	safeJsonLd: (obj: unknown) => JSON.stringify(obj),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		className,
	}: {
		children: React.ReactNode;
		href: string;
		className?: string;
	}) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
}));

vi.mock("lucide-react", () => ({
	MessageCircle: ({ className }: { className?: string }) => (
		<svg data-testid="icon-message-circle" className={className} />
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { FaqSection } from "../faq-section";

// ============================================================================
// HELPERS
// ============================================================================

function createFaqItem(overrides = {}) {
	return {
		id: `faq-${Math.random()}`,
		question: "Question test ?",
		answer: "Réponse test.",
		links: null,
		position: 0,
		isActive: true,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

async function renderFaqSection() {
	let result: ReturnType<typeof render>;
	await act(async () => {
		result = render(
			<Suspense fallback={<div>Loading...</div>}>
				<FaqSection />
			</Suspense>,
		);
	});
	return result!;
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("FaqSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// ─── Empty state ──────────────────────────────────────────────────────────

	it("renders nothing when there are no FAQ items", async () => {
		mockGetFaqItems.mockResolvedValue([]);
		const { container } = await renderFaqSection();
		expect(container).toBeEmptyDOMElement();
	});

	// ─── With items ───────────────────────────────────────────────────────────

	it("renders the section when FAQ items exist", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		expect(screen.getByRole("region")).toBeInTheDocument();
	});

	it("renders 'Questions fréquentes' heading", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		expect(screen.getByText("Questions fréquentes")).toBeInTheDocument();
	});

	it("renders the section title with id 'faq-title'", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		expect(screen.getByTestId("section-title")).toHaveAttribute("id", "faq-title");
	});

	it("renders the subtitle text", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		expect(
			screen.getByText("Retrouvez ici les réponses aux questions les plus posées"),
		).toBeInTheDocument();
	});

	// ─── Accordion ────────────────────────────────────────────────────────────

	it("renders the FaqAccordion with all items", async () => {
		mockGetFaqItems.mockResolvedValue([
			createFaqItem({ question: "FAQ 1 ?" }),
			createFaqItem({ question: "FAQ 2 ?" }),
		]);
		await renderFaqSection();
		expect(screen.getByTestId("faq-accordion")).toBeInTheDocument();
		expect(screen.getByTestId("question-0")).toHaveTextContent("FAQ 1 ?");
		expect(screen.getByTestId("question-1")).toHaveTextContent("FAQ 2 ?");
	});

	it("renders the FaqDoodles component", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		expect(screen.getByTestId("faq-doodles")).toBeInTheDocument();
	});

	// ─── CTA contact ─────────────────────────────────────────────────────────

	it("renders the contact CTA section", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		expect(screen.getByText("Vous n'avez pas trouvé votre réponse ?")).toBeInTheDocument();
	});

	it("renders 'Me contacter' link with correct mailto", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		const link = screen.getByRole("link", { name: /Me contacter/ });
		expect(link).toHaveAttribute("href", "mailto:contact@synclune.fr");
	});

	// ─── Skip link ────────────────────────────────────────────────────────────

	it("renders a skip link to #faq-cta-contact", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		const skipLink = screen.getByRole("link", { name: "Passer au contact" });
		expect(skipLink).toHaveAttribute("href", "#faq-cta-contact");
	});

	// ─── CTA id ───────────────────────────────────────────────────────────────

	it("CTA section has id faq-cta-contact", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		const ctaSection = document.getElementById("faq-cta-contact");
		expect(ctaSection).not.toBeNull();
	});

	// ─── JSON-LD schema ───────────────────────────────────────────────────────

	it("renders a JSON-LD script tag with faq-schema id", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem({ question: "Q?", answer: "A." })]);
		await renderFaqSection();
		const script = document.getElementById("faq-schema");
		expect(script).not.toBeNull();
		expect(script?.getAttribute("type")).toBe("application/ld+json");
		const content = JSON.parse(script?.textContent ?? "{}");
		expect(content["@type"]).toBe("FAQPage");
	});

	// ─── aria-labelledby ──────────────────────────────────────────────────────

	it("section has aria-labelledby='faq-title'", async () => {
		mockGetFaqItems.mockResolvedValue([createFaqItem()]);
		await renderFaqSection();
		const section = screen.getByRole("region");
		expect(section).toHaveAttribute("aria-labelledby", "faq-title");
	});
});
