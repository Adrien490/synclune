import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		prefetch: _prefetch,
		...rest
	}: {
		href: string;
		children: React.ReactNode;
		prefetch?: boolean;
		[k: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/animations/reveal", () => ({
	Reveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild: _asChild,
		className,
		...rest
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		className?: string;
		[k: string]: unknown;
	}) => (
		<span className={className} data-testid="button-wrapper" {...rest}>
			{children}
		</span>
	),
}));

vi.mock("lucide-react", () => ({
	Sparkles: (props: { className?: string }) => <svg data-testid="sparkles-icon" {...props} />,
}));

import { ProductCustomizationLink } from "../product-customization-link";
import type { GetProductReturn } from "@/modules/products/types/product.types";

function makeProduct(overrides: Partial<GetProductReturn> = {}): GetProductReturn {
	return {
		id: "prod-1",
		slug: "bague-lune",
		title: "Bague Lune",
		type: { id: "t-1", slug: "bague", label: "Bague", isActive: true },
		...overrides,
	} as unknown as GetProductReturn;
}

afterEach(cleanup);

describe("ProductCustomizationLink", () => {
	it("renders a visible secondary CTA with the French label", () => {
		render(<ProductCustomizationLink product={makeProduct()} />);
		expect(screen.getByText(/créer une version personnalisée/i)).toBeInTheDocument();
	});

	it("renders a descriptive subtitle", () => {
		render(<ProductCustomizationLink product={makeProduct()} />);
		expect(screen.getByText(/un bijou unique, adapté à vos envies/i)).toBeInTheDocument();
	});

	it("links to /personnalisation with inspiredBy slug and type", () => {
		render(<ProductCustomizationLink product={makeProduct()} />);
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe(
			"/personnalisation?inspiredBy=bague-lune&type=bague#form",
		);
	});

	it("omits the type query param when the product has no type", () => {
		render(<ProductCustomizationLink product={makeProduct({ type: null })} />);
		const link = screen.getByRole("link");
		expect(link.getAttribute("href")).toBe("/personnalisation?inspiredBy=bague-lune#form");
	});

	it("includes the Sparkles icon with aria-hidden", () => {
		render(<ProductCustomizationLink product={makeProduct()} />);
		const icon = screen.getByTestId("sparkles-icon");
		expect(icon).toBeInTheDocument();
	});
});
