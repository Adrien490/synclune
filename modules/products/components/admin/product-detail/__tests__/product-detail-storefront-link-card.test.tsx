import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

vi.mock("@phosphor-icons/react/ssr", () => ({
	ArrowSquareOutIcon: () => <svg data-testid="icon-external-link" />,
	EyeIcon: () => <svg data-testid="icon-eye" />,
	EyeSlashIcon: () => <svg data-testid="icon-eye-off" />,
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		target,
		rel,
		"aria-label": ariaLabel,
		"aria-describedby": ariaDescribedBy,
	}: {
		children: React.ReactNode;
		href: string;
		target?: string;
		rel?: string;
		"aria-label"?: string;
		"aria-describedby"?: string;
	}) => (
		<a
			href={href}
			target={target}
			rel={rel}
			aria-label={ariaLabel}
			aria-describedby={ariaDescribedBy}
		>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ variant, className, ...props }: RenderPropMockProps) =>
		renderPropMock("button", { type: "button", ...props }),
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

	it("affiche un lien d'aperçu brouillon actif + helper si DRAFT", () => {
		render(<ProductDetailStorefrontLinkCard slug="anneau-lune" status="DRAFT" />);
		const link = screen.getByRole("link", { name: /Aperçu de la fiche produit en brouillon/i });
		expect(link).toHaveAttribute("href", "/creations/anneau-lune");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
		expect(screen.getByText(/visible que par les administrateurs/i)).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("le lien d'aperçu brouillon est lié au helper via aria-describedby", () => {
		render(<ProductDetailStorefrontLinkCard slug="x" status="DRAFT" />);
		const link = screen.getByRole("link", { name: /Aperçu de la fiche produit en brouillon/i });
		expect(link).toHaveAttribute("aria-describedby", "storefront-link-help");
	});

	it("affiche un bouton désactivé + helper si ARCHIVED", () => {
		render(<ProductDetailStorefrontLinkCard slug="anneau-lune" status="ARCHIVED" />);
		const button = screen.getByRole("button", { name: /Voir sur la boutique/ });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-describedby", "storefront-link-help");
		expect(screen.getByText(/archivé/)).toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});
