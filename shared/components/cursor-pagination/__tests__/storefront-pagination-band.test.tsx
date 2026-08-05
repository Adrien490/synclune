import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockRouterPush, mockRouterPrefetch, mockHaptic, mockSearchParams } = vi.hoisted(() => ({
	mockRouterPush: vi.fn(),
	mockRouterPrefetch: vi.fn(),
	mockHaptic: vi.fn(),
	mockSearchParams: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		prefetch: mockRouterPrefetch,
		replace: vi.fn(),
	}),
	usePathname: () => "/produits",
	useSearchParams: () => mockSearchParams.current,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	CaretLeftIcon: () => <span data-testid="icon-chevron-left" />,
	CaretRightIcon: () => <span data-testid="icon-chevron-right" />,
	SpinnerIcon: () => <span data-testid="icon-loader" />,
}));

import { StorefrontPaginationBand } from "../storefront-pagination-band";

const defaultProps = {
	title: "La suite de l'étal",
	noun: { singular: "bijou", plural: "bijoux" },
	hasNextPage: true,
	hasPreviousPage: false,
	currentPageSize: 20,
	nextCursor: "cm1abc2def3ghi4jkl5mnop" as string | null,
	prevCursor: null as string | null,
	totalCount: 48,
};

function renderBand(overrides?: Partial<typeof defaultProps>) {
	return render(<StorefrontPaginationBand {...defaultProps} {...overrides} />);
}

describe("StorefrontPaginationBand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams.current = new URLSearchParams();
	});

	afterEach(cleanup);

	describe("rendu conditionnel", () => {
		it("ne rend rien quand la liste tient sur une page (même règle que la barre admin)", () => {
			const { container } = renderBand({ hasNextPage: false, hasPreviousPage: false });
			expect(container).toBeEmptyDOMElement();
		});

		it("rend une nav « Pagination » avec un contrôle focusable (contrat e2e keyboard-navigation)", () => {
			renderBand();
			const nav = screen.getByRole("navigation", { name: "Pagination" });
			expect(nav).toBeInTheDocument();
			expect(screen.getByRole("button", { name: /Découvrir la suite/ })).toBeInTheDocument();
		});

		it("rend une live region polite", () => {
			renderBand();
			const status = screen.getByRole("status");
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(status).toHaveTextContent("Page chargée, 20 bijoux.");
		});
	});

	describe("copie tournée vers l'avant", () => {
		it("première page avec total : « Encore N à découvrir — tu en as vu X sur Y »", () => {
			renderBand();
			const nav = screen.getByRole("navigation");
			expect(nav).toHaveTextContent("Encore 28 bijoux à découvrir — tu en as vu 20 sur 48.");
			expect(screen.getByText("La suite de l'étal")).toBeInTheDocument();
		});

		it("accorde le singulier quand il ne reste qu'une pièce", () => {
			renderBand({ currentPageSize: 47, totalCount: 48 });
			expect(screen.getByRole("navigation")).toHaveTextContent("Encore 1 bijou à découvrir");
		});

		it("page profonde : pas de « Encore N » inventé (position incalculable en curseur opaque)", () => {
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderBand({ hasPreviousPage: true, prevCursor: "cm0abc2def3ghi4jkl5mnop" });
			const nav = screen.getByRole("navigation");
			expect(nav).not.toHaveTextContent(/Encore \d/);
			expect(nav).toHaveTextContent("Il en reste à découvrir — 48 bijoux en tout.");
		});

		it("sans totalCount : repli sans compte", () => {
			renderBand({ totalCount: undefined });
			expect(screen.getByRole("navigation")).toHaveTextContent("Il en reste à découvrir.");
		});

		it("dernière page : « Tu as tout vu ! », pas de CTA, copie de parcours", () => {
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderBand({
				hasNextPage: false,
				hasPreviousPage: true,
				nextCursor: null,
				prevCursor: "cm0abc2def3ghi4jkl5mnop",
			});
			expect(screen.getByText("Tu as tout vu !")).toBeInTheDocument();
			expect(screen.getByRole("navigation")).toHaveTextContent(
				"Tu viens de parcourir les 48 bijoux de la boutique.",
			);
			expect(screen.queryByRole("button", { name: /Découvrir la suite/ })).not.toBeInTheDocument();
		});

		it("le titre display ne contient jamais de chiffre (Winky Sans sans chiffres tabulaires)", () => {
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			renderBand({
				hasNextPage: false,
				hasPreviousPage: true,
				prevCursor: "cm0abc2def3gh4jkl5mno",
			});
			// Les deux titres possibles de la bande : celui passé en prop et l'état final.
			for (const el of [screen.getByText("Tu as tout vu !")]) {
				expect(el.textContent).not.toMatch(/\d/);
			}
		});
	});

	describe("navigation", () => {
		it("« Découvrir la suite » pousse cursor + direction=forward en préservant les autres params", async () => {
			mockSearchParams.current = new URLSearchParams({ sortBy: "price_asc" });
			const user = userEvent.setup();
			renderBand();
			await user.click(screen.getByRole("button", { name: /Découvrir la suite/ }));
			expect(mockRouterPush).toHaveBeenCalled();
			const [url, options] = mockRouterPush.mock.calls[0] as [string, { scroll: boolean }];
			expect(url).toContain("cursor=cm1abc2def3ghi4jkl5mnop");
			expect(url).toContain("direction=forward");
			expect(url).toContain("sortBy=price_asc");
			expect(options).toEqual({ scroll: false });
		});

		it("« Page précédente » pousse direction=backward", async () => {
			const user = userEvent.setup();
			renderBand({
				hasPreviousPage: true,
				prevCursor: "cm0abc2def3ghi4jkl5mnop",
			});
			await user.click(screen.getByRole("button", { name: "Page précédente" }));
			const url = mockRouterPush.mock.calls[0]?.[0] as string;
			expect(url).toContain("direction=backward");
			expect(url).toContain("cursor=cm0abc2def3ghi4jkl5mnop");
		});

		it("« Revenir au début » purge cursor et direction", async () => {
			mockSearchParams.current = new URLSearchParams({
				cursor: "cm1abc2def3ghi4jkl5mnop",
				direction: "forward",
			});
			const user = userEvent.setup();
			renderBand({ hasPreviousPage: true, prevCursor: "cm0abc2def3ghi4jkl5mnop" });
			await user.click(screen.getByRole("button", { name: "Revenir au début" }));
			const url = mockRouterPush.mock.calls[0]?.[0] as string;
			expect(url).not.toContain("cursor=");
			expect(url).not.toContain("direction=");
		});

		it("« Revenir au début » n'apparaît pas en première page", () => {
			renderBand();
			expect(screen.queryByRole("button", { name: "Revenir au début" })).not.toBeInTheDocument();
		});

		it("haptique : light sur la navigation, selection sur le retour au début", async () => {
			mockSearchParams.current = new URLSearchParams({ cursor: "cm1abc2def3ghi4jkl5mnop" });
			const user = userEvent.setup();
			renderBand({ hasPreviousPage: true, prevCursor: "cm0abc2def3ghi4jkl5mnop" });
			await user.click(screen.getByRole("button", { name: /Découvrir la suite/ }));
			expect(mockHaptic).toHaveBeenCalledWith("light");
			await user.click(screen.getByRole("button", { name: "Revenir au début" }));
			expect(mockHaptic).toHaveBeenCalledWith("selection");
		});

		it("prefetch les pages voisines au montage", () => {
			renderBand({ hasPreviousPage: true, prevCursor: "cm0abc2def3ghi4jkl5mnop" });
			const prefetched = mockRouterPrefetch.mock.calls.map((c) => c[0] as string);
			expect(prefetched.some((u) => u.includes("direction=forward"))).toBe(true);
			expect(prefetched.some((u) => u.includes("direction=backward"))).toBe(true);
		});
	});

	describe("pas de meuble d'admin", () => {
		it("aucun sélecteur « Par page » ni compteur de « résultats » dans la bande", () => {
			renderBand();
			expect(screen.queryByText("Par page")).not.toBeInTheDocument();
			expect(screen.queryByText(/résultats?/)).not.toBeInTheDocument();
		});
	});
});
