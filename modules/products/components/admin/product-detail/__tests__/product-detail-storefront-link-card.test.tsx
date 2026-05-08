import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	ExternalLink: () => <svg data-testid="icon-external-link" />,
	EyeOff: () => <svg data-testid="icon-eye-off" />,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		rel,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		rel?: string;
		"aria-label"?: string;
	}) => (
		<a href={href} target={target} rel={rel} aria-label={ariaLabel}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		disabled,
		"aria-describedby": ariaDescribedBy,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		disabled?: boolean;
		variant?: string;
		className?: string;
		"aria-describedby"?: string;
	}) =>
		asChild ? (
			<>{children}</>
		) : (
			<button type="button" disabled={disabled} aria-describedby={ariaDescribedBy}>
				{children}
			</button>
		),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { ProductDetailStorefrontLinkCard } from "../product-detail-storefront-link-card";

describe("ProductDetailStorefrontLinkCard", () => {
	afterEach(cleanup);

	it("affiche un lien actif vers /creations/[slug] target=_blank si PUBLIC", () => {
		render(<ProductDetailStorefrontLinkCard slug="anneau-lune" status="PUBLIC" />);
		const link = screen.getByRole("link", { name: /Voir la fiche produit sur la boutique/i });
		expect(link).toHaveAttribute("href", "/creations/anneau-lune");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("affiche un bouton désactivé + helper si DRAFT", () => {
		render(<ProductDetailStorefrontLinkCard slug="anneau-lune" status="DRAFT" />);
		const button = screen.getByRole("button", { name: /Voir sur la boutique/ });
		expect(button).toBeDisabled();
		expect(screen.getByText(/en brouillon/)).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("affiche un bouton désactivé + helper si ARCHIVED", () => {
		render(<ProductDetailStorefrontLinkCard slug="anneau-lune" status="ARCHIVED" />);
		const button = screen.getByRole("button", { name: /Voir sur la boutique/ });
		expect(button).toBeDisabled();
		expect(screen.getByText(/archivé/)).toBeInTheDocument();
	});

	it("le bouton désactivé est lié au helper via aria-describedby", () => {
		render(<ProductDetailStorefrontLinkCard slug="x" status="DRAFT" />);
		const button = screen.getByRole("button", { name: /Voir sur la boutique/ });
		expect(button).toHaveAttribute("aria-describedby", "storefront-link-help");
	});
});
