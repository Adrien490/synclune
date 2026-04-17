import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

vi.mock("@/app/_components/not-found-content", () => ({
	NotFoundContent: ({
		title,
		description,
		actions,
	}: {
		emoji: React.ReactNode;
		title: React.ReactNode;
		description: React.ReactNode;
		actions: React.ReactNode;
	}) => (
		<div>
			{title}
			{description}
			{actions}
		</div>
	),
}));

vi.mock("@/shared/components/animations", () => ({
	ParticleBackground: () => null,
	ParticleBackgroundError: () => null,
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

import * as Sentry from "@sentry/nextjs";
import ProductDetailError from "../error";

describe("ProductDetailError", () => {
	const error = Object.assign(new Error("Product fetch failed"), { digest: "abc123" });
	const reset = vi.fn();

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("reports error to Sentry with product-detail tag and digest", () => {
		render(<ProductDetailError error={error} reset={reset} />);
		expect(Sentry.captureException).toHaveBeenCalledWith(error, {
			tags: {
				route: "product-detail",
				digest: "abc123",
			},
		});
	});

	it("falls back to 'unknown' digest when absent", () => {
		const errWithoutDigest = new Error("no digest") as Error & { digest?: string };
		render(<ProductDetailError error={errWithoutDigest} reset={reset} />);
		expect(Sentry.captureException).toHaveBeenCalledWith(errWithoutDigest, {
			tags: {
				route: "product-detail",
				digest: "unknown",
			},
		});
	});

	it("renders product-aware error heading", () => {
		render(<ProductDetailError error={error} reset={reset} />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			/impossible d'afficher cette création/i,
		);
	});

	it("renders retry button that calls reset", async () => {
		render(<ProductDetailError error={error} reset={reset} />);
		await userEvent.click(screen.getByRole("button", { name: /réessayer/i }));
		expect(reset).toHaveBeenCalledOnce();
	});

	it("renders link to product listing (/produits)", () => {
		render(<ProductDetailError error={error} reset={reset} />);
		expect(screen.getByRole("link", { name: /voir toutes les créations/i })).toHaveAttribute(
			"href",
			"/produits",
		);
	});

	it("renders link back to home", () => {
		render(<ProductDetailError error={error} reset={reset} />);
		expect(screen.getByRole("link", { name: /retour à l'accueil/i })).toHaveAttribute("href", "/");
	});
});
