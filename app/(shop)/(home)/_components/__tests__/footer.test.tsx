import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
	Logo: ({
		href,
		viewTransitionName,
	}: {
		href: string;
		viewTransitionName?: string;
		[key: string]: unknown;
	}) => (
		<span style={{ viewTransitionName }}>
			<a href={href} data-testid="logo">
				Logo
			</a>
		</span>
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

// Mock CopyButton (renders a button — keeps email region link count stable)
vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({
		text,
		label,
	}: {
		text: string;
		label: string;
		size?: string;
		className?: string;
	}) => (
		<button
			type="button"
			data-testid="copy-button"
			data-text={text}
			aria-label={`Copier ${label.toLowerCase()}`}
		>
			Copier
		</button>
	),
}));

// Mock haptic hook to spy on FooterLink interactions without touching navigator.vibrate
const triggerHapticMock = vi.fn();
vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => triggerHapticMock,
	triggerHaptic: (...args: unknown[]) => triggerHapticMock(...args),
}));

// Mock cookie-consent provider so ManageCookiesButton can call resetConsent without a Provider
const resetConsentMock = vi.fn();
vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (state: { resetConsent: () => void }) => unknown) =>
		selector({ resetConsent: resetConsentMock }),
}));

import { Footer, FooterSkeleton } from "../footer";

afterEach(() => {
	cleanup();
	triggerHapticMock.mockClear();
	resetConsentMock.mockClear();
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

	// Refonte « La signature » (2026-08-04) : « Navigation » → « La boutique », et
	// « Aide et FAQ » descend dans la colonne contact — le libre-service se lit
	// avant l'adresse e-mail, pas au milieu du plan de site.
	it("renders the shop column with its 3 navigation links", async () => {
		await renderFooter();

		const navSection = screen.getByRole("navigation", { name: /la boutique/i });
		expect(navSection).toBeInTheDocument();

		const navHeading = screen.getByText("La boutique");
		expect(navHeading.tagName).toBe("H3");

		const links = within(navSection).getAllByRole("link");
		expect(links).toHaveLength(3);

		expect(links[0]).toHaveAttribute("href", "/produits");
		expect(links[0]).toHaveTextContent("Les créations");

		expect(links[1]).toHaveAttribute("href", "/collections");
		expect(links[1]).toHaveTextContent("Les collections");

		// « Mon compte » → « Mes favoris » : l'espace client a été retiré
		// (2026-07-31), les favoris sont la seule surface personnelle restante.
		expect(links[2]).toHaveAttribute("href", "/favoris");
		expect(links[2]).toHaveTextContent("Mes favoris");
	});

	// --- Focus ring SSOT (WCAG 2.4.7) ---

	it("applies focus-ring SSOT utility on FooterLink anchors", async () => {
		await renderFooter();

		const navSection = screen.getByRole("navigation", { name: /la boutique/i });
		const links = within(navSection).getAllByRole("link");
		for (const link of links) {
			expect(link.className).toContain("focus-ring");
		}
	});

	// --- Contact section ---

	it("renders the contact column with help, email, copy-button and location", async () => {
		await renderFooter();

		const contactSection = screen.getByRole("region", { name: /écrire à l'atelier/i });
		expect(contactSection).toBeInTheDocument();

		const links = within(contactSection).getAllByRole("link");
		expect(links).toHaveLength(2);

		// L'aide d'abord — déflexion avant le message (refonte 2026-08-04).
		expect(links[0]).toHaveAttribute("href", "/aide");
		expect(links[0]).toHaveTextContent("Aide et FAQ");

		expect(links[1]).toHaveAttribute("href", "mailto:contact@synclune.fr");
		expect(links[1]).toHaveAttribute(
			"aria-label",
			"Envoyer un email à Synclune : contact@synclune.fr",
		);

		// Adjacent CopyButton allows copying email without launching mail app
		const copyButton = within(contactSection).getByTestId("copy-button");
		expect(copyButton).toHaveAttribute("data-text", "contact@synclune.fr");

		expect(within(contactSection).getByText(/France/)).toBeInTheDocument();
	});

	// --- Social links ---

	// Refonte « La signature » (2026-08-04) : les deux réseaux deviennent des
	// pastilles icône-seule dans le bloc signature. Les handles ne sont plus du
	// texte visible — WCAG 2.5.3 (Label in Name) ne s'applique donc plus, mais le
	// nom accessible continue de les porter, et c'est ce qui est verrouillé ici.
	it("renders social links as icon-only pastilles with handles in the accessible name", async () => {
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
			"@synclune.bijoux — Instagram de Synclune (nouvelle fenêtre)",
		);

		// TikTok
		expect(links[1]).toHaveAttribute("href", "https://www.tiktok.com/@synclune");
		expect(links[1]).toHaveAttribute("target", "_blank");
		expect(links[1]).toHaveAttribute("rel", "noopener noreferrer");
		expect(links[1]).toHaveAttribute(
			"aria-label",
			"@synclune — TikTok de Synclune (nouvelle fenêtre)",
		);

		// Icône seule : aucun texte visible dans la pastille.
		expect(links[0]!.textContent).toBe("");
		expect(links[1]!.textContent).toBe("");
	});

	// --- Reassurance items ---

	it("does NOT duplicate the reassurance block (SSOT = HeroReassuranceBanner under the hero)", async () => {
		await renderFooter();

		// Le bloc « Engagements et garanties » a été retiré du footer : la réassurance
		// livraison/retours vit uniquement dans le bandeau sous le hero. Le footer ne
		// garde que la confiance transactionnelle (bloc Paiement sécurisé).
		expect(screen.queryByRole("region", { name: /engagements/i })).not.toBeInTheDocument();
		expect(screen.queryByText("Retours sous 14 jours")).not.toBeInTheDocument();
		expect(screen.queryByText(/Livraison France/)).not.toBeInTheDocument();
	});

	// --- Payment icons ---

	it("renders 3 payment icons with individual aria-labels", async () => {
		await renderFooter();

		const visa = screen.getByTestId("visa-icon");
		expect(visa).toHaveAttribute("aria-label", "Visa accepté");

		const mastercard = screen.getByTestId("mastercard-icon");
		expect(mastercard).toHaveAttribute("aria-label", "Mastercard accepté");

		const cb = screen.getByTestId("cb-icon");
		expect(cb).toHaveAttribute("aria-label", "Carte Bancaire acceptée");
	});

	it("renders payment icons list with aria-label", async () => {
		await renderFooter();

		const paymentList = screen.getByRole("list", { name: /moyens de paiement/i });
		expect(paymentList).toBeInTheDocument();
		expect(within(paymentList).getAllByRole("listitem")).toHaveLength(3);
	});

	// --- StripeWordmark ---

	it("renders the StripeWordmark", async () => {
		await renderFooter();

		expect(screen.getByTestId("stripe-wordmark")).toBeInTheDocument();
		expect(screen.getByText("Sécurisé par")).toBeInTheDocument();
	});

	// --- Copyright ---

	// Le millésime a été RETIRÉ le 2026-08-04, et son absence est un invariant, pas
	// un oubli : `Footer` est un scope `"use cache"` profil `reference` (7 j de
	// stale, 24 h de revalidation) dont le tag n'a aucun mutateur. Toute valeur
	// dérivée du temps y est figée au remplissage de l'entrée — l'année était donc
	// fausse pendant environ une journée chaque 1ᵉʳ janvier. La mention de
	// copyright n'a besoin d'aucune date (Convention de Berne : la protection ne
	// dépend d'aucune formalité). Réintroduire un millésime ici exige de sortir la
	// valeur du cache, pas seulement de la recalculer.
	it("renders the copyright without any time-derived value", async () => {
		await renderFooter();

		const copyright = screen.getByText(/© Synclune/);
		expect(copyright).toBeInTheDocument();
		expect(copyright.textContent).toContain("Tous droits réservés");
		expect(copyright.textContent).not.toMatch(/\d{4}/);
	});

	// --- Legal links ---

	it("renders 6 legal links in a dedicated nav", async () => {
		await renderFooter();

		const legalNav = screen.getByRole("navigation", { name: /liens légaux/i });
		expect(legalNav).toBeInTheDocument();

		const links = within(legalNav).getAllByRole("link");
		expect(links).toHaveLength(6);

		// Libellés abrégés le 2026-08-04 pour tenir en deux colonnes sous `sm` sans
		// repasser à la ligne (le bandeau empilait 7 cibles pleine largeur, 308 px).
		expect(links[0]).toHaveTextContent("CGV");
		expect(links[1]).toHaveTextContent("Mentions légales");
		expect(links[2]).toHaveTextContent("Confidentialité");
		expect(links[3]).toHaveTextContent("Cookies");
		expect(links[4]).toHaveTextContent("Rétractation");
		expect(links[5]).toHaveTextContent("Accessibilité");
	});

	// WCAG 2.5.3 (Label in Name) : dès qu'un libellé visible est abrégé, le nom
	// accessible doit le CONTENIR — sinon la commande vocale « clique sur
	// Confidentialité » ne trouve plus la cible. Assertion en boucle : elle couvre
	// aussi tout libellé qu'on abrégerait plus tard en oubliant son `ariaLabel`.
	it("keeps every legal link's accessible name containing its visible label", async () => {
		await renderFooter();

		const legalNav = screen.getByRole("navigation", { name: /liens légaux/i });
		for (const link of within(legalNav).getAllByRole("link")) {
			const visibleLabel = link.textContent;
			expect(visibleLabel).toBeTruthy();
			expect(link.getAttribute("aria-label") ?? visibleLabel).toContain(visibleLabel);
		}
	});

	// Les libellés seuls ne suffisent pas : un href cassé (`/cvg`) passait au vert.
	// Littéraux volontaires — asserter `ROUTES.LEGAL.*` ne ferait que refléter la
	// source du composant, sans épingler le contrat d'URL.
	it("points each legal link to its expected route", async () => {
		await renderFooter();

		const legalNav = screen.getByRole("navigation", { name: /liens légaux/i });
		const links = within(legalNav).getAllByRole("link");

		expect(links[0]).toHaveAttribute("href", "/cgv");
		expect(links[1]).toHaveAttribute("href", "/mentions-legales");
		expect(links[2]).toHaveAttribute("href", "/confidentialite");
		expect(links[3]).toHaveAttribute("href", "/cookies");
		expect(links[4]).toHaveAttribute("href", "/retractation");
		expect(links[5]).toHaveAttribute("href", "/accessibilite");
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

	// --- Manage cookies preferences (P0.3) ---

	it("renders a 'Modifier mes préférences' button inside the legal nav", async () => {
		await renderFooter();

		const legalNav = screen.getByRole("navigation", { name: /liens légaux/i });
		const manageButton = within(legalNav).getByRole("button", {
			name: /modifier mes préférences cookies/i,
		});
		expect(manageButton).toBeInTheDocument();
		expect(manageButton).toHaveTextContent("Modifier mes préférences");
	});

	it("calls resetConsent when 'Modifier mes préférences' is clicked", async () => {
		await renderFooter();

		const manageButton = screen.getByRole("button", {
			name: /modifier mes préférences cookies/i,
		});
		fireEvent.click(manageButton);

		expect(resetConsentMock).toHaveBeenCalledTimes(1);
		expect(triggerHapticMock).toHaveBeenCalledWith("light");
	});

	// --- viewTransitionName (P1.3) ---

	it("sets viewTransitionName on the footer root and on the logo wrapper", async () => {
		await renderFooter();

		const footer = screen.getByRole("contentinfo");
		expect(footer.style.viewTransitionName).toBe("shop-footer");

		const logo = screen.getByTestId("logo");
		const logoWrapper = logo.parentElement;
		expect(logoWrapper?.style.viewTransitionName).toBe("shop-logo-footer");
	});

	// --- Logo visible on mobile (P1.1) ---

	it("renders the Logo without the hidden-on-mobile class", async () => {
		await renderFooter();

		const logo = screen.getByTestId("logo");
		// The logo column should no longer rely on `hidden sm:block`
		const logoColumn = logo.closest("div.order-1");
		expect(logoColumn).not.toBeNull();
		expect(logoColumn?.className).not.toMatch(/\bhidden\b/);
	});
});

// ---------------------------------------------------------------------------
// Squelette
// ---------------------------------------------------------------------------

describe("FooterSkeleton", () => {
	// Un landmark ne doit pas changer d'identité au swap Suspense : le squelette
	// était `aria-hidden`, donc `contentinfo` DISPARAISSAIT de l'arbre pendant le
	// stream. Même arbitrage que `NavbarSkeleton` (2026-08-04) — `aria-busy` porte
	// l'état de chargement, le nom porte l'identité.
	it("exposes the same contentinfo landmark and accessible name as the real footer", async () => {
		render(<FooterSkeleton />);

		const skeleton = screen.getByRole("contentinfo");
		expect(skeleton).toHaveAttribute("aria-label", "Informations et liens utiles");
		expect(skeleton).toHaveAttribute("aria-busy", "true");
		expect(skeleton).not.toHaveAttribute("aria-hidden");

		cleanup();

		const Result = await Footer();
		render(Result);
		expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
			"Informations et liens utiles",
		);
	});
});
