import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/animations", () => ({
	Fade: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/animated-number", () => ({
	AnimatedNumber: ({ value, formatter }: { value: number; formatter?: (n: number) => string }) => (
		<span data-testid="animated-number">{formatter ? formatter(value) : value}</span>
	),
}));

const getPublicProductCount = vi.fn<() => Promise<number>>();
const getPublicCollectionCount = vi.fn<() => Promise<number>>();

vi.mock("@/modules/products/data/get-public-product-count", () => ({
	getPublicProductCount: () => getPublicProductCount(),
}));
vi.mock("@/modules/collections/data/get-public-collection-count", () => ({
	getPublicCollectionCount: () => getPublicCollectionCount(),
}));

import { AtelierStats, ATELIER_STATS_MIN_PRODUCTS } from "../atelier-stats";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("AtelierStats", () => {
	it("rend les 3 stats avec libellés français (pluriel)", async () => {
		getPublicProductCount.mockResolvedValue(24);
		getPublicCollectionCount.mockResolvedValue(5);

		render(await AtelierStats());

		expect(screen.getByText("créations uniques")).toBeInTheDocument();
		expect(screen.getByText("collections")).toBeInTheDocument();
		expect(screen.getByText("faits main à Nantes")).toBeInTheDocument();
		expect(screen.getByText("24")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();
		// « % » statique à côté du compteur (une fonction formatter ne passe pas la frontière RSC)
		expect(screen.getByText("100")).toBeInTheDocument();
		expect(screen.getByText(/%/)).toBeInTheDocument();
	});

	it("s'auto-masque sous le seuil pré-lancement", async () => {
		getPublicProductCount.mockResolvedValue(ATELIER_STATS_MIN_PRODUCTS - 1);
		getPublicCollectionCount.mockResolvedValue(2);

		expect(await AtelierStats()).toBeNull();
	});

	it("masque la stat collections quand le count est 0 (garde créations + fait main)", async () => {
		getPublicProductCount.mockResolvedValue(10);
		getPublicCollectionCount.mockResolvedValue(0);

		render(await AtelierStats());

		expect(screen.getByText("créations uniques")).toBeInTheDocument();
		expect(screen.queryByText(/collections?$/)).not.toBeInTheDocument();
		expect(screen.getByText("faits main à Nantes")).toBeInTheDocument();
	});

	it("accorde le singulier « collection » quand il n'y en a qu'une", async () => {
		getPublicProductCount.mockResolvedValue(10);
		getPublicCollectionCount.mockResolvedValue(1);

		render(await AtelierStats());

		expect(screen.getByText("collection")).toBeInTheDocument();
		expect(screen.queryByText("collections")).not.toBeInTheDocument();
	});
});
