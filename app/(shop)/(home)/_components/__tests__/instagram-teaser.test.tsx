import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockHaptic = vi.fn();

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	HandDrawnUnderline: () => <div data-testid="underline" />,
	Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: {
		section: {
			title: { y: 20, duration: 0.5 },
			subtitle: { y: 15, delay: 0.1, duration: 0.4 },
			content: { y: 20, delay: 0.2, duration: 0.6 },
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

vi.mock("@/shared/components/icons/instagram-icon", () => ({
	InstagramIcon: ({ decorative }: { decorative?: boolean; [key: string]: unknown }) => (
		<svg data-testid="instagram-icon" aria-hidden={decorative ? "true" : undefined} />
	),
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

vi.mock("lucide-react", () => ({
	ArrowUpRight: (props: Record<string, unknown>) => (
		<svg data-testid="arrow-icon" aria-hidden={props["aria-hidden"] as boolean} />
	),
	ImageIcon: (props: Record<string, unknown>) => (
		<svg data-testid="image-icon" aria-hidden={props["aria-hidden"] as boolean} />
	),
}));

vi.mock("@/shared/constants/spacing", () => ({
	SECTION_SPACING: { section: "py-16" },
	CONTAINER_CLASS: "container",
}));

vi.mock("@/shared/constants/brand", () => ({
	BRAND: {
		social: {
			instagram: {
				handle: "@synclune.bijoux",
				url: "https://www.instagram.com/synclune.bijoux/",
			},
		},
	},
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

import { InstagramTeaser } from "../instagram-teaser";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InstagramTeaser", () => {
	it("renders section with correct id and aria attributes", () => {
		render(<InstagramTeaser />);

		const section = document.getElementById("instagram-teaser");
		expect(section).not.toBeNull();
		expect(section?.getAttribute("aria-labelledby")).toBe("instagram-teaser-title");
		expect(section?.getAttribute("aria-describedby")).toBe("instagram-teaser-subtitle");
	});

	it("applies viewTransitionName for View Transitions API", () => {
		render(<InstagramTeaser />);

		const section = document.getElementById("instagram-teaser");
		expect(section?.style.viewTransitionName).toBe("instagram-teaser");
	});

	it("renders h2 title with stable id", () => {
		render(<InstagramTeaser />);

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("instagram-teaser-title");
		expect(heading.textContent).toContain("Suivez l'atelier au quotidien");
	});

	it("renders HandDrawnUnderline below title", () => {
		render(<InstagramTeaser />);

		expect(screen.getByTestId("underline")).toBeInTheDocument();
	});

	it("renders subtitle with stable id and editorial copy", () => {
		render(<InstagramTeaser />);

		const subtitle = document.getElementById("instagram-teaser-subtitle");
		expect(subtitle).not.toBeNull();
		expect(subtitle?.textContent).toContain("Les coulisses, les essais ratés");
	});

	it("renders PlaceholderImage with descriptive aria-label", () => {
		render(<InstagramTeaser />);

		const placeholder = screen.getByRole("img", { name: /Aperçu de la galerie Instagram/i });
		expect(placeholder).toBeInTheDocument();
	});

	it("renders Instagram handle badge with handle text", () => {
		render(<InstagramTeaser />);

		expect(screen.getByText("@synclune.bijoux")).toBeInTheDocument();
	});

	it("renders 2 highlight items as plain text (no icons)", () => {
		render(<InstagramTeaser />);

		expect(screen.getByText("Nouvelles créations en avant-première")).toBeInTheDocument();
		expect(screen.getByText("Coulisses et work in progress de l'atelier")).toBeInTheDocument();
	});

	it("renders CTA link with correct href, target, rel and enriched aria-label", () => {
		render(<InstagramTeaser />);

		const cta = screen.getByRole("link", { name: /Suivre Synclune sur Instagram/i });
		expect(cta).toHaveAttribute("href", "https://www.instagram.com/synclune.bijoux/");
		expect(cta).toHaveAttribute("target", "_blank");
		expect(cta).toHaveAttribute("rel", "noopener noreferrer");
		expect(cta.getAttribute("aria-label")).toContain("@synclune.bijoux");
		expect(cta.getAttribute("aria-label")).toContain("nouvelle fenêtre");
	});

	it("triggers selection haptic when CTA is clicked", () => {
		render(<InstagramTeaser />);

		const cta = screen.getByRole("link", { name: /Suivre Synclune sur Instagram/i });
		fireEvent.click(cta);

		expect(mockHaptic).toHaveBeenCalledTimes(1);
		expect(mockHaptic).toHaveBeenCalledWith("selection");
	});

	it("uses InstagramIcon in decorative mode (aria-hidden)", () => {
		render(<InstagramTeaser />);

		const icons = screen.getAllByTestId("instagram-icon");
		expect(icons.length).toBeGreaterThanOrEqual(2);
		for (const icon of icons) {
			expect(icon).toHaveAttribute("aria-hidden", "true");
		}
	});
});
