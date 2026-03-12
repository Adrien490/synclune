import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock next/cache directives (no-op in tests)
vi.mock("next/cache", () => ({
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

// Mock next/link
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

// Mock Fade as passthrough
vi.mock("@/shared/components/animations/fade", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock HandDrawnAccent
vi.mock("@/shared/components/animations/hand-drawn-accent", () => ({
	HandDrawnAccent: () => <span data-testid="hand-drawn-accent" />,
}));

// Mock Logo
vi.mock("@/shared/components/logo", () => ({
	Logo: ({ href }: { href: string; [key: string]: unknown }) => (
		<a href={href} data-testid="logo">
			Logo
		</a>
	),
}));

// Mock payment icons
vi.mock("@/shared/components/icons/payment-icons", () => ({
	VisaIcon: (props: Record<string, unknown>) => (
		<svg data-testid="visa-icon" aria-label={props["aria-label"] as string} />
	),
	MastercardIcon: (props: Record<string, unknown>) => (
		<svg data-testid="mastercard-icon" aria-label={props["aria-label"] as string} />
	),
	CBIcon: (props: Record<string, unknown>) => (
		<svg data-testid="cb-icon" aria-label={props["aria-label"] as string} />
	),
	PayPalIcon: (props: Record<string, unknown>) => (
		<svg data-testid="paypal-icon" aria-label={props["aria-label"] as string} />
	),
}));

// Mock social icons
vi.mock("@/shared/components/icons/instagram-icon", () => ({
	InstagramIcon: () => <svg data-testid="instagram-icon" />,
}));

vi.mock("@/shared/components/icons/tiktok-icon", () => ({
	TikTokIcon: () => <svg data-testid="tiktok-icon" />,
}));

// Mock StripeWordmark
vi.mock("@/modules/payments/components/stripe-wordmark", () => ({
	StripeWordmark: () => <span data-testid="stripe-wordmark">Stripe</span>,
}));

import { Footer } from "../footer";

afterEach(() => {
	cleanup();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Footer", () => {
	async function renderFooter() {
		const Result = await Footer();
		return render(Result);
	}

	// --- Semantic structure ---

	it("renders a footer element with aria-labelledby", async () => {
		await renderFooter();

		const footer = screen.getByRole("contentinfo");
		expect(footer).toBeInTheDocument();
		expect(footer).toHaveAttribute("aria-labelledby", "footer-heading");
	});

	it("renders a sr-only h2 heading", async () => {
		await renderFooter();

		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading).toBeInTheDocument();
		expect(heading.id).toBe("footer-heading");
		expect(heading.textContent).toBe("Informations et liens utiles");
		expect(heading.className).toContain("sr-only");
	});

	it("renders the Logo linking to home", async () => {
		await renderFooter();

		const logo = screen.getByTestId("logo");
		expect(logo).toHaveAttribute("href", "/");
	});

	// --- Navigation section ---

	it("renders navigation section with 4 footer nav items", async () => {
		await renderFooter();

		const navSection = screen.getByRole("navigation", { name: /navigation/i });
		expect(navSection).toBeInTheDocument();

		const navHeading = screen.getByText("Navigation");
		expect(navHeading.tagName).toBe("H3");

		const links = within(navSection).getAllByRole("link");
		expect(links).toHaveLength(4);

		expect(links[0]).toHaveAttribute("href", "/produits");
		expect(links[0]).toHaveTextContent("Les créations");

		expect(links[1]).toHaveAttribute("href", "/collections");
		expect(links[1]).toHaveTextContent("Les collections");

		expect(links[2]).toHaveAttribute("href", "/personnalisation");
		expect(links[2]).toHaveTextContent("Personnalisation");

		expect(links[3]).toHaveAttribute("href", "/commandes");
		expect(links[3]).toHaveTextContent("Mon compte");
	});

	// --- Contact section ---

	it("renders contact section with email and location", async () => {
		await renderFooter();

		const contactSection = screen.getByRole("region", { name: /contact/i });
		expect(contactSection).toBeInTheDocument();

		const emailLink = within(contactSection).getByRole("link");
		expect(emailLink).toHaveAttribute("href", "mailto:contact@synclune.fr");
		expect(emailLink).toHaveAttribute(
			"aria-label",
			"Envoyer un email à Synclune : contact@synclune.fr",
		);

		expect(within(contactSection).getByText(/France/)).toBeInTheDocument();
	});

	// --- Social links ---

	it("renders social links for Instagram and TikTok with target _blank", async () => {
		await renderFooter();

		const socialNav = screen.getByRole("navigation", { name: /réseaux sociaux/i });
		const links = within(socialNav).getAllByRole("link");
		expect(links).toHaveLength(2);

		// Instagram
		expect(links[0]).toHaveAttribute("href", "https://www.instagram.com/synclune.bijoux/");
		expect(links[0]).toHaveAttribute("target", "_blank");
		expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
		expect(links[0]).toHaveAttribute(
			"aria-label",
			"Suivre Synclune sur Instagram (nouvelle fenêtre)",
		);
		expect(within(links[0]!).getByText("@synclune.bijoux")).toBeInTheDocument();

		// TikTok
		expect(links[1]).toHaveAttribute("href", "https://www.tiktok.com/@synclune");
		expect(links[1]).toHaveAttribute("target", "_blank");
		expect(links[1]).toHaveAttribute("aria-label", "Suivre Synclune sur TikTok (nouvelle fenêtre)");
		expect(within(links[1]!).getByText("@synclune")).toBeInTheDocument();
	});

	// --- Reassurance items ---

	it("renders 3 reassurance items with trust signals", async () => {
		await renderFooter();

		const reassurance = screen.getByRole("region", { name: /engagements/i });
		expect(reassurance).toBeInTheDocument();

		const items = within(reassurance).getAllByRole("listitem");
		expect(items).toHaveLength(3);

		expect(screen.getByText("Livraison France : 4,99€")).toBeInTheDocument();
		expect(screen.getByText("Livraison UE : 9,50€")).toBeInTheDocument();

		expect(screen.getByText("Retours sous 14 jours")).toBeInTheDocument();
		expect(screen.getByText("Échange ou remboursement")).toBeInTheDocument();

		// "Paiement sécurisé" appears in both reassurance and sr-only h3, scope to reassurance
		expect(within(reassurance).getByText("Paiement sécurisé")).toBeInTheDocument();
		expect(within(reassurance).getByText("CB, PayPal")).toBeInTheDocument();
	});

	// --- Payment icons ---

	it("renders 4 payment icons with individual aria-labels", async () => {
		await renderFooter();

		const visa = screen.getByTestId("visa-icon");
		expect(visa).toHaveAttribute("aria-label", "Visa accepté");

		const mastercard = screen.getByTestId("mastercard-icon");
		expect(mastercard).toHaveAttribute("aria-label", "Mastercard accepté");

		const cb = screen.getByTestId("cb-icon");
		expect(cb).toHaveAttribute("aria-label", "Carte Bancaire acceptée");

		const paypal = screen.getByTestId("paypal-icon");
		expect(paypal).toHaveAttribute("aria-label", "PayPal accepté");
	});

	it("renders payment icons list with aria-label", async () => {
		await renderFooter();

		const paymentList = screen.getByRole("list", { name: /moyens de paiement/i });
		expect(paymentList).toBeInTheDocument();
		expect(within(paymentList).getAllByRole("listitem")).toHaveLength(4);
	});

	// --- StripeWordmark ---

	it("renders the StripeWordmark", async () => {
		await renderFooter();

		expect(screen.getByTestId("stripe-wordmark")).toBeInTheDocument();
		expect(screen.getByText("Sécurisé par")).toBeInTheDocument();
	});

	// --- Copyright ---

	it("renders copyright with current year and brand name", async () => {
		await renderFooter();

		const year = new Date().getFullYear();
		const copyright = screen.getByText(new RegExp(`© ${year} Synclune`));
		expect(copyright).toBeInTheDocument();
		expect(copyright.textContent).toContain("Tous droits réservés");
	});

	// --- Legal links ---

	it("renders 6 legal links in a dedicated nav", async () => {
		await renderFooter();

		const legalNav = screen.getByRole("navigation", { name: /liens légaux/i });
		expect(legalNav).toBeInTheDocument();

		const links = within(legalNav).getAllByRole("link");
		expect(links).toHaveLength(6);

		// CGV has ariaLabel
		const cgv = links[0];
		expect(cgv).toHaveTextContent("CGV");
		expect(cgv).toHaveAttribute("aria-label", "Conditions Générales de Vente");

		// Others
		expect(links[1]).toHaveTextContent("Mentions légales");
		expect(links[2]).toHaveTextContent("Politique de confidentialité");
		expect(links[3]).toHaveTextContent("Gestion des cookies");
		expect(links[4]).toHaveTextContent("Formulaire de rétractation");
		expect(links[5]).toHaveTextContent("Accessibilité");
	});

	// --- sr-only payment heading ---

	it("renders a sr-only heading for payment section", async () => {
		await renderFooter();

		const paymentHeading = screen.getByText("Paiement sécurisé", {
			selector: "h3",
		});
		expect(paymentHeading).toBeInTheDocument();
		expect(paymentHeading.className).toContain("sr-only");
	});
});
