import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
	SplitText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
	Stagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 0, duration: 0 },
			subtitle: { y: 0, delay: 0, duration: 0 },
			grid: { stagger: 0, y: 0 },
			content: { duration: 0 },
			cta: { y: 0, delay: 0, duration: 0 },
			underline: { delay: 0 },
		},
		stagger: { slow: 0 },
		duration: { normal: 0, emphasis: 0 },
		easing: { easeOut: [0, 0, 1, 1] },
	},
}));

vi.mock("@/shared/components/section-title", () => ({
	SectionTitle: ({ children, id }: { children: React.ReactNode; id?: string }) => (
		<h2 id={id}>{children}</h2>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...rest
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => (asChild ? <>{children}</> : <button {...rest}>{children}</button>),
}));

vi.mock("@/shared/constants/images", () => ({
	IMAGES: { ATELIER: "https://example.com/atelier.jpg" },
}));

vi.mock("@/shared/constants/seo-config", () => ({
	SITE_URL: "https://synclune.fr",
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { spacious: "py-16" },
}));

vi.mock("@/shared/styles/fonts", () => ({
	petitFormalScript: { className: "font-script" },
}));

vi.mock("../creative-process-timeline", () => ({
	CreativeProcessTimeline: () => <div data-testid="timeline" />,
}));

vi.mock("../signature-reveal", () => ({
	SignatureReveal: () => <div data-testid="signature-reveal" />,
}));

vi.mock("../polaroid-gallery", () => ({
	PolaroidGallery: () => <div data-testid="polaroid-gallery" />,
}));

vi.mock("../../parallax-image", () => ({
	// eslint-disable-next-line @next/next/no-img-element
	ParallaxImage: ({ alt }: { alt: string }) => <img data-testid="parallax-image" alt={alt} />,
}));

import { processSteps } from "../process-steps";

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Helper: render async server component
// ---------------------------------------------------------------------------

async function renderAtelierSection() {
	const { AtelierSection } = await import("../atelier-section");
	const jsx = await AtelierSection();
	return render(jsx);
}

// ---------------------------------------------------------------------------
// 1. JSON-LD Schema
// ---------------------------------------------------------------------------

describe("HowTo JSON-LD schema", () => {
	it("renders a valid JSON-LD script tag", async () => {
		await renderAtelierSection();

		const script = document.querySelector('script#howto-schema[type="application/ld+json"]');
		expect(script).not.toBeNull();

		const schema = JSON.parse(script!.textContent!);
		expect(schema["@type"]).toBe("HowTo");
		expect(schema["@context"]).toBe("https://schema.org");
	});

	it("has correct metadata", async () => {
		await renderAtelierSection();

		const script = document.querySelector('script#howto-schema[type="application/ld+json"]');
		const schema = JSON.parse(script!.textContent!);

		expect(schema.inLanguage).toBe("fr-FR");
		expect(schema.totalTime).toBe("PT3H");
		expect(schema.name).toBeTruthy();
		expect(schema.description).toBeTruthy();
	});

	it("includes all process steps", async () => {
		await renderAtelierSection();

		const script = document.querySelector('script#howto-schema[type="application/ld+json"]');
		const schema = JSON.parse(script!.textContent!);

		expect(schema.step).toHaveLength(processSteps.length);
		for (let i = 0; i < processSteps.length; i++) {
			const step = processSteps[i]!;
			expect(schema.step[i]["@type"]).toBe("HowToStep");
			expect(schema.step[i].position).toBe(i + 1);
			expect(schema.step[i].name).toBe(step.title);
			expect(schema.step[i].text).toBe(step.description);
			expect(schema.step[i].url).toContain(`#creative-step-${step.id}`);
		}
	});

	it("includes supplies and tools", async () => {
		await renderAtelierSection();

		const script = document.querySelector('script#howto-schema[type="application/ld+json"]');
		const schema = JSON.parse(script!.textContent!);

		expect(schema.supply.length).toBeGreaterThan(0);
		expect(schema.tool.length).toBeGreaterThan(0);
		expect(schema.supply[0]["@type"]).toBe("HowToSupply");
		expect(schema.tool[0]["@type"]).toBe("HowToTool");
	});

	it("escapes HTML entities to prevent XSS", async () => {
		await renderAtelierSection();

		const script = document.querySelector('script#howto-schema[type="application/ld+json"]');
		expect(script!.innerHTML).not.toContain("<script");
		// The replace(/</g, "\\u003c") should convert any < into the unicode escape
		expect(script!.innerHTML).not.toMatch(/<(?!\/script>)/);
	});
});

// ---------------------------------------------------------------------------
// 1bis. ItemList JSON-LD (polaroid gallery) — retiré tant que les 4 polaroids
// pointent vers la même image (signal SEO trompeur). À ré-injecter quand
// chaque polaroid aura un imageUrl distinct (cf polaroid-config.ts).
// ---------------------------------------------------------------------------

describe("ItemList JSON-LD (polaroid gallery)", () => {
	it("n'est pas injecté tant que les polaroids n'ont pas de visuels distincts", async () => {
		await renderAtelierSection();

		const scripts = document.querySelectorAll('script[type="application/ld+json"]');
		expect(scripts.length).toBe(1);

		const itemListScript = document.querySelector("script#polaroid-gallery-schema");
		expect(itemListScript).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// 2. Section Structure
// ---------------------------------------------------------------------------

describe("AtelierSection structure", () => {
	it("renders section with aria-labelledby", async () => {
		await renderAtelierSection();

		const section = document.querySelector("section#atelier-section");
		expect(section).not.toBeNull();
		expect(section!.getAttribute("aria-labelledby")).toBe("atelier-section-title");
	});

	it("applies viewTransitionName for View Transitions API", async () => {
		await renderAtelierSection();

		const section = document.querySelector<HTMLElement>("section#atelier-section");
		expect(section?.style.viewTransitionName).toBe("atelier-section");
	});

	it("does not render an orphan skip link (CTA absent — section is silent storytelling)", async () => {
		await renderAtelierSection();

		const skipLink = document.querySelector('a[href="#atelier-cta"]');
		expect(skipLink).toBeNull();

		const ctaTarget = document.querySelector("#atelier-cta");
		expect(ctaTarget).toBeNull();
	});

	it("renders the section title", async () => {
		await renderAtelierSection();

		expect(screen.getByText("Mon atelier")).toBeInTheDocument();
	});

	it("renders the new editorial subtitle", async () => {
		await renderAtelierSection();

		expect(screen.getByText(/chaque bijou prend vie, un geste à la fois/i)).toBeInTheDocument();
	});

	it("renders timeline and polaroid gallery", async () => {
		await renderAtelierSection();

		expect(screen.getByTestId("timeline")).toBeInTheDocument();
		expect(screen.getByTestId("polaroid-gallery")).toBeInTheDocument();
	});
});
