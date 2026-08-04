import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: Record<string, unknown> & { children?: unknown; href: string }) => {
		const { createElement } = require("react");
		return createElement("a", { href, ...props }, children);
	},
}));

vi.mock("@phosphor-icons/react/ssr", () => {
	const { createElement } = require("react");
	return {
		CaretLeftIcon: (props: Record<string, unknown>) =>
			createElement("svg", { "data-testid": "chevron-left", ...props }),
	};
});

vi.mock("@/shared/components/animations/hand-drawn-accent", () => {
	const { createElement } = require("react");
	return {
		HandDrawnAccent: ({ variant }: { variant: string }) =>
			createElement("svg", {
				"data-testid": "hand-drawn-accent",
				"data-variant": variant,
				"aria-hidden": "true",
			}),
	};
});

// Import AFTER mocks
import { PageHeader } from "../page-header";
import { SITE_URL } from "@/shared/constants/seo-config";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS — DEFAULT MODE
// ============================================================================

describe("PageHeader", () => {
	describe("default mode", () => {
		it("renders h1 with the title", () => {
			render(<PageHeader title="Mon Titre" />);

			const heading = screen.getByRole("heading", { level: 1 });
			expect(heading).toHaveTextContent("Mon Titre");
			expect(heading).toHaveAttribute("id", "page-title");
		});

		it("renders header with aria-labelledby pointing to page-title", () => {
			render(<PageHeader title="Test" />);

			expect(screen.getByRole("banner")).toHaveAttribute("aria-labelledby", "page-title");
		});

		it("renders description when provided", () => {
			render(<PageHeader title="Test" description="Une description" />);

			expect(screen.getByText("Une description")).toBeInTheDocument();
		});

		it("does not render description when not provided", () => {
			const { container } = render(<PageHeader title="Test" />);

			expect(container.querySelector("p")).toBeNull();
		});

		it("applies descriptionClassName to description", () => {
			render(<PageHeader title="Test" description="Desc" descriptionClassName="text-lg" />);

			expect(screen.getByText("Desc")).toHaveClass("text-lg");
		});

		it("applies custom className to the header", () => {
			render(<PageHeader title="Test" className="my-custom" />);

			expect(screen.getByRole("banner")).toHaveClass("my-custom");
		});
	});

	// ============================================================================
	// TESTS — BREADCRUMBS
	// ============================================================================

	describe("breadcrumbs", () => {
		const breadcrumbs = [
			{ label: "Produits", href: "/produits" },
			{ label: "Bague Lune", href: "/produits/bague-lune" },
		];

		it("renders breadcrumb nav with aria-label", () => {
			render(<PageHeader title="Bague Lune" breadcrumbs={breadcrumbs} />);

			expect(screen.getByLabelText("Fil d'Ariane")).toBeInTheDocument();
		});

		it("automatically includes Accueil as first breadcrumb", () => {
			render(<PageHeader title="Test" breadcrumbs={breadcrumbs} />);

			const accueilLink = screen.getByRole("link", { name: "Accueil" });
			expect(accueilLink).toHaveAttribute("href", "/");
		});

		it("renders intermediate breadcrumbs as links", () => {
			render(<PageHeader title="Test" breadcrumbs={breadcrumbs} />);

			const produitsLink = screen.getByRole("link", { name: "Produits" });
			expect(produitsLink).toHaveAttribute("href", "/produits");
		});

		it("marks the last breadcrumb with aria-current='page'", () => {
			render(<PageHeader title="Test" breadcrumbs={breadcrumbs} />);

			const current = screen.getByText("Bague Lune");
			expect(current).toHaveAttribute("aria-current", "page");
		});

		it("last breadcrumb is not a link", () => {
			render(<PageHeader title="Test" breadcrumbs={breadcrumbs} />);

			const current = screen.getByText("Bague Lune");
			expect(current.tagName).toBe("SPAN");
		});

		it("renders separator between breadcrumbs", () => {
			render(<PageHeader title="Test" breadcrumbs={breadcrumbs} />);

			// Separators are aria-hidden spans with "/"
			const separators = screen.getAllByText("/");
			expect(separators.length).toBe(breadcrumbs.length);
			for (const sep of separators) {
				expect(sep).toHaveAttribute("aria-hidden", "true");
			}
		});
	});

	// ============================================================================
	// TESTS — MOBILE BACK BUTTON
	// ============================================================================

	describe("mobile back button", () => {
		it("renders back button linking to previous breadcrumb when multiple", () => {
			const breadcrumbs = [
				{ label: "Produits", href: "/produits" },
				{ label: "Bague Lune", href: "/produits/bague-lune" },
			];
			render(<PageHeader title="Bague Lune" breadcrumbs={breadcrumbs} />);

			const backLink = screen.getByLabelText("Retour vers Produits");
			expect(backLink).toHaveAttribute("href", "/produits");
		});

		it("renders back button linking to / when single breadcrumb", () => {
			render(<PageHeader title="Contact" breadcrumbs={[{ label: "Contact", href: "/contact" }]} />);

			const backLink = screen.getByLabelText("Retour vers Accueil");
			expect(backLink).toHaveAttribute("href", "/");
		});

		it("renders ChevronLeft icon in back button", () => {
			render(<PageHeader title="Test" breadcrumbs={[{ label: "Test", href: "/test" }]} />);

			expect(screen.getByTestId("chevron-left")).toBeInTheDocument();
		});

		it("does not render back button without breadcrumbs", () => {
			render(<PageHeader title="Test" />);

			expect(screen.queryByTestId("chevron-left")).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// TESTS — ACTIONS
	// ============================================================================

	describe("actions", () => {
		it("renders actions with role='group'", () => {
			render(<PageHeader title="Test" actions={<button>Action</button>} />);

			const group = screen.getByRole("group", { name: "Actions de la page" });
			expect(group).toBeInTheDocument();
		});

		it("renders action content", () => {
			render(<PageHeader title="Test" actions={<button>Mon Action</button>} />);

			expect(screen.getByText("Mon Action")).toBeInTheDocument();
		});

		it("does not render actions group when no actions provided", () => {
			render(<PageHeader title="Test" />);

			expect(screen.queryByRole("group")).not.toBeInTheDocument();
		});

		it("hides actions on mobile when breadcrumbs are present", () => {
			render(
				<PageHeader
					title="Test"
					breadcrumbs={[{ label: "Test", href: "/test" }]}
					actions={<button>Action</button>}
				/>,
			);

			const group = screen.getByRole("group", { name: "Actions de la page" });
			expect(group.className).toContain("hidden sm:flex");
		});
	});

	// ============================================================================
	// TESTS — JSON-LD BreadcrumbList
	// ============================================================================

	describe("structured data (JSON-LD BreadcrumbList)", () => {
		const breadcrumbs = [
			{ label: "Produits", href: "/produits" },
			{ label: "Bague Lune", href: "/produits/bague-lune" },
		];

		it("emits a <script type='application/ld+json'> when breadcrumbs are present", () => {
			const { container } = render(<PageHeader title="Bague Lune" breadcrumbs={breadcrumbs} />);

			const script = container.querySelector('script[type="application/ld+json"]');
			expect(script).toBeInTheDocument();
		});

		it("does not emit JSON-LD when breadcrumbs are empty", () => {
			const { container } = render(<PageHeader title="Test" />);

			expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
		});

		it("does not emit JSON-LD when noStructuredData is true", () => {
			const { container } = render(
				<PageHeader title="Bague Lune" breadcrumbs={breadcrumbs} noStructuredData />,
			);

			expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
		});

		it("does not emit JSON-LD in compact variant even if breadcrumbs passed", () => {
			const { container } = render(
				<PageHeader title="Dashboard" variant="compact" breadcrumbs={breadcrumbs} />,
			);

			expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
		});

		it("includes Accueil + breadcrumb items with SITE_URL-prefixed absolute URLs", () => {
			const { container } = render(<PageHeader title="Bague Lune" breadcrumbs={breadcrumbs} />);

			const script = container.querySelector('script[type="application/ld+json"]');
			expect(script).toBeInTheDocument();

			// The script content is escaped (< → <). Decode for assertions.
			const raw = script!.innerHTML
				.replace(/\\u003c/g, "<")
				.replace(/\\u003e/g, ">")
				.replace(/\\u0026/g, "&");
			const parsed = JSON.parse(raw);

			expect(parsed["@context"]).toBe("https://schema.org");
			expect(parsed["@type"]).toBe("BreadcrumbList");
			expect(parsed.itemListElement).toHaveLength(3);
			expect(parsed.itemListElement[0]).toEqual({
				"@type": "ListItem",
				position: 1,
				name: "Accueil",
				item: SITE_URL,
			});
			expect(parsed.itemListElement[1]).toEqual({
				"@type": "ListItem",
				position: 2,
				name: "Produits",
				item: `${SITE_URL}/produits`,
			});
			expect(parsed.itemListElement[2]).toEqual({
				"@type": "ListItem",
				position: 3,
				name: "Bague Lune",
				item: `${SITE_URL}/produits/bague-lune`,
			});
		});
	});

	// ============================================================================
	// TESTS — ACCENT (HandDrawnAccent)
	// ============================================================================

	describe("decorative accent", () => {
		it("renders HandDrawnAccent SVG when accent='underline' is passed", () => {
			render(<PageHeader title="Les collections" accent="underline" />);

			const accent = screen.getByTestId("hand-drawn-accent");
			expect(accent).toBeInTheDocument();
			expect(accent).toHaveAttribute("data-variant", "underline");
			expect(accent).toHaveAttribute("aria-hidden", "true");
		});

		it("renders HandDrawnAccent with variant='circle' when accent='circle'", () => {
			render(<PageHeader title="Test" accent="circle" />);

			expect(screen.getByTestId("hand-drawn-accent")).toHaveAttribute("data-variant", "circle");
		});

		it("does not render accent when accent prop is omitted", () => {
			render(<PageHeader title="Test" />);

			expect(screen.queryByTestId("hand-drawn-accent")).not.toBeInTheDocument();
		});

		it("does not render accent in compact variant", () => {
			render(<PageHeader title="Dashboard" variant="compact" accent="underline" />);

			expect(screen.queryByTestId("hand-drawn-accent")).not.toBeInTheDocument();
		});
	});

	// ============================================================================
	// TESTS — COMPACT VARIANT
	// ============================================================================

	describe("compact variant", () => {
		it("renders h1 in compact mode", () => {
			render(<PageHeader title="Dashboard" variant="compact" />);

			expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Dashboard");
		});

		it("does not render breadcrumbs in compact mode", () => {
			render(
				<PageHeader
					title="Dashboard"
					variant="compact"
					breadcrumbs={[{ label: "Admin", href: "/admin" }]}
				/>,
			);

			expect(screen.queryByLabelText("Fil d'Ariane")).not.toBeInTheDocument();
		});

		it("renders actions in compact mode", () => {
			render(<PageHeader title="Dashboard" variant="compact" actions={<button>Créer</button>} />);

			expect(screen.getByText("Créer")).toBeInTheDocument();
		});

		it("renders description in compact mode", () => {
			render(<PageHeader title="Dashboard" variant="compact" description="Vue d'ensemble" />);

			expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument();
		});
	});
});
