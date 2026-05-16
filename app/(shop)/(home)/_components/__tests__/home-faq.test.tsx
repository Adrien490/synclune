import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			subtitle: { y: 15, delay: 0.1, duration: 0.4 },
			cta: { y: 10, delay: 0.1, duration: 0.4 },
			underline: { delay: 0.15 },
		},
	},
}));

vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({
		children,
		id,
	}: {
		children: React.ReactNode;
		id?: string;
		[key: string]: unknown;
	}) => <h2 id={id}>{children}</h2>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...(props as object)}>{children}</button>),
}));

vi.mock("@/shared/components/ui/accordion", () => ({
	Accordion: ({
		children,
		onValueChange,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		onValueChange?: (value: string) => void;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<div data-testid="accordion" aria-label={ariaLabel} data-on-value-change={!!onValueChange}>
			<button
				type="button"
				data-testid="accordion-mock-toggle"
				onClick={() => onValueChange?.("fait-main")}
			>
				toggle
			</button>
			<button type="button" data-testid="accordion-mock-close" onClick={() => onValueChange?.("")}>
				close
			</button>
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
		[key: string]: unknown;
	}) => (
		<div data-testid="accordion-item" data-value={value} className={className}>
			{children}
		</div>
	),
	AccordionTrigger: ({
		children,
		headingLevel,
	}: {
		children: React.ReactNode;
		headingLevel?: number;
		[key: string]: unknown;
	}) => (
		<button type="button" data-testid="accordion-trigger" data-heading-level={headingLevel}>
			{children}
		</button>
	),
	AccordionContent: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
		<div data-testid="accordion-content">{children}</div>
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { section: "py-16" },
	CONTAINER_CLASS: "container",
}));

vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://synclune.fr",
}));

vi.mock("@/shared/constants/brand", () => ({
	BRAND: {
		contact: { email: "contact@synclune.fr" },
	},
}));

vi.mock("@/shared/utils/safe-json-ld", () => ({
	safeJsonLd: (data: unknown) => JSON.stringify(data),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...(props as object)}>
			{children}
		</a>
	),
}));

import { HomeFaq, HOME_FAQ_ITEMS } from "../home-faq";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HomeFaq", () => {
	it("renders section with stable id and aria attributes", () => {
		render(<HomeFaq />);

		const section = document.getElementById("home-faq");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("home-faq-title");
		expect(section?.getAttribute("aria-describedby")).toBe("home-faq-subtitle");
	});

	it("applies viewTransitionName for View Transitions API", () => {
		render(<HomeFaq />);

		const section = document.getElementById("home-faq");
		expect(section?.style.viewTransitionName).toBe("home-faq");
	});

	it("applies scroll-mt classes for deep-linking under fixed navbar", () => {
		render(<HomeFaq />);

		const section = document.getElementById("home-faq");
		expect(section?.className).toContain("scroll-mt-24");
		expect(section?.className).toContain("lg:scroll-mt-28");
	});

	it("renders h2 title with stable id", () => {
		render(<HomeFaq />);

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading.id).toBe("home-faq-title");
		expect(heading.textContent).toContain("Questions fréquentes");
	});

	it("renders HandDrawnUnderline below the title", () => {
		render(<HomeFaq />);

		expect(screen.getByTestId("underline")).toBeInTheDocument();
	});

	it("renders subtitle with stable id and value-oriented copy", () => {
		render(<HomeFaq />);

		const subtitle = document.getElementById("home-faq-subtitle");
		expect(subtitle).not.toBeNull();
		expect(subtitle?.textContent).toContain("Livraison, retours, entretien, personnalisation");
	});

	it("renders 6 accordion items with stable ids and headingLevel=3", () => {
		render(<HomeFaq />);

		const items = screen.getAllByTestId("accordion-item");
		expect(items).toHaveLength(6);
		expect(items.map((i) => i.getAttribute("data-value"))).toEqual([
			"fait-main",
			"delai",
			"entretien",
			"personnalisation",
			"retours",
			"editions-limitees",
		]);

		const triggers = screen.getAllByTestId("accordion-trigger");
		for (const trigger of triggers) {
			expect(trigger.getAttribute("data-heading-level")).toBe("3");
		}
	});

	it("applies scroll-mt on each accordion item for fragment deep-linking", () => {
		render(<HomeFaq />);

		const items = screen.getAllByTestId("accordion-item");
		for (const item of items) {
			expect(item.className).toContain("scroll-mt-24");
			expect(item.className).toContain("lg:scroll-mt-28");
		}
	});

	it("renders mailto CTA with subject and aria-describedby", () => {
		render(<HomeFaq />);

		const cta = screen.getByRole("link", { name: /Une autre question/i });
		expect(cta.getAttribute("href")).toBe(
			"mailto:contact@synclune.fr?subject=Une%20question%20sur%20Synclune",
		);
		expect(cta.getAttribute("aria-describedby")).toBe("home-faq-cta-description");
	});

	it("renders mailto link inside personnalisation answer", () => {
		render(<HomeFaq />);

		const links = screen.getAllByRole("link", { name: /Écrivez-moi/i });
		const personnalisationLink = links.find((l) =>
			l.getAttribute("href")?.includes("Demande%20de%20personnalisation"),
		);
		expect(personnalisationLink).toBeDefined();
		expect(personnalisationLink!.getAttribute("href")).toBe(
			"mailto:contact@synclune.fr?subject=Demande%20de%20personnalisation",
		);
	});

	it("renders internal link to /retractation inside retours answer", () => {
		render(<HomeFaq />);

		const link = screen.getByRole("link", { name: /Détails complets/i });
		expect(link.getAttribute("href")).toBe("/retractation");
	});

	it("emits FAQPage JSON-LD with all 6 questions, inLanguage and dateModified", () => {
		render(<HomeFaq />);

		const script = document.getElementById("home-faq-schema");
		expect(script).not.toBeNull();
		expect(script?.getAttribute("type")).toBe("application/ld+json");

		const json = JSON.parse(script!.innerHTML);
		expect(json["@type"]).toBe("FAQPage");
		expect(json["@id"]).toBe("https://synclune.fr/#faq");
		expect(json.inLanguage).toBe("fr-FR");
		expect(json.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(json.mainEntity).toHaveLength(6);
		for (const entity of json.mainEntity) {
			expect(entity["@type"]).toBe("Question");
			expect(typeof entity.name).toBe("string");
			expect(entity.acceptedAnswer["@type"]).toBe("Answer");
			expect(typeof entity.acceptedAnswer.text).toBe("string");
			// answerText must be plain text — never includes JSX-leaked tags.
			expect(entity.acceptedAnswer.text).not.toMatch(/<\/?strong/);
		}
	});

	it("HOME_FAQ_ITEMS exposes plain answerText for SEO + ReactNode answer for UI", () => {
		expect(HOME_FAQ_ITEMS).toHaveLength(6);
		for (const item of HOME_FAQ_ITEMS) {
			expect(typeof item.answerText).toBe("string");
			expect(item.answerText.length).toBeGreaterThan(20);
			expect(item.answer).toBeDefined();
		}
	});
});
