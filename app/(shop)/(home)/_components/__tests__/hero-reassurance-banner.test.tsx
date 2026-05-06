import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/modules/orders/services/shipping.service", () => ({
	formatShippingPrice: (cents: number) => `${(cents / 100).toFixed(2)} €`,
}));

vi.mock("@/modules/orders/constants/shipping-rates", () => ({
	SHIPPING_RATES: {
		FR: { amount: 499, estimatedDays: "2-4 jours ouvrés" },
		EU: { amount: 950 },
	},
}));

vi.mock("@/shared/components/icons/payment-icons", () => ({
	VisaIcon: (props: React.SVGProps<SVGSVGElement>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img alt="Visa" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
	MastercardIcon: (props: React.SVGProps<SVGSVGElement>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img alt="Mastercard" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
	CBIcon: (props: React.SVGProps<SVGSVGElement>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img alt="CB" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
	),
}));

import { HeroReassuranceBanner } from "../hero-reassurance-banner";

afterEach(cleanup);

describe("HeroReassuranceBanner", () => {
	it("renders the four trust-signal list items", () => {
		render(<HeroReassuranceBanner />);
		expect(screen.getAllByRole("listitem")).toHaveLength(4);
	});

	it("exposes a sr-only heading wired via aria-labelledby", () => {
		const { container } = render(<HeroReassuranceBanner />);
		const heading = screen.getByRole("heading", { name: /nos engagements/i, level: 2 });
		expect(heading).toHaveClass("sr-only");
		expect(heading.id).toBe("reassurance-heading");
		const section = container.querySelector("section");
		expect(section?.getAttribute("aria-labelledby")).toBe("reassurance-heading");
	});

	it("forces explicit list role on the ul (Safari VoiceOver fix)", () => {
		const { container } = render(<HeroReassuranceBanner />);
		const ul = container.querySelector("ul");
		expect(ul?.getAttribute("role")).toBe("list");
	});

	it("renders dynamic shipping prices for FR and EU", () => {
		render(<HeroReassuranceBanner />);
		expect(screen.getByText(/Livraison France 4\.99 €/i)).toBeInTheDocument();
		expect(screen.getByText(/UE 9\.50 €/)).toBeInTheDocument();
		expect(screen.getByText(/2-4 jours ouvrés/)).toBeInTheDocument();
	});

	it("renders Visa, Mastercard and CB payment icons under secure-payment", () => {
		render(<HeroReassuranceBanner />);
		expect(screen.getByRole("img", { name: "Visa" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Mastercard" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "CB" })).toBeInTheDocument();
	});

	it("links 'Faits main en France' to the about page", () => {
		render(<HeroReassuranceBanner />);
		const link = screen.getByRole("link", { name: /faits main en france/i });
		expect(link.getAttribute("href")).toBe("/a-propos");
	});

	it("keeps shipping/returns/payment items non-clickable", () => {
		render(<HeroReassuranceBanner />);
		const links = screen.getAllByRole("link");
		expect(links).toHaveLength(1);
	});

	it("exposes view-transition-name for cross-page morph", () => {
		const { container } = render(<HeroReassuranceBanner />);
		const section = container.querySelector("section");
		expect(section?.style.viewTransitionName).toBe("reassurance-banner");
	});

	it("groups payment icons under an accessible label", () => {
		render(<HeroReassuranceBanner />);
		const group = screen.getByLabelText("Moyens de paiement acceptés");
		expect(within(group).getByRole("img", { name: "Visa" })).toBeInTheDocument();
	});
});
