/**
 * @regression responsive-action-menu-link-history-back-bug-2026-05-15
 *
 * Bug : un `<Link>` rendu dans `MobileActionRow` était précédemment wrappé
 * dans `<DrawerClose asChild>`, ce qui déclenchait `Vaul.onOpenChange(false)`
 * → `useBackButtonClose.handleClose()` → `history.back()`. Cet appel
 * synchrone *race* le `router.push` queué par `Link.linkClicked` (qui passe
 * par `startTransition`) et annule la navigation : l'utilisateur restait sur
 * la même page après tap, sans message d'erreur.
 *
 * Fix (commit 2026-05-15) : le `<Link>` n'est plus wrappé dans
 * `<DrawerClose asChild>`. La fermeture du Drawer passe par le contexte
 * `requestClose()` qui set `open=false` *via la prop contrôlée* — sans
 * trip-aller au handler Vaul `onOpenChange`, donc sans `history.back()`.
 *
 * Garde-fou : ce test verrouille (1) que le Link n'est pas dans un
 * DrawerClose ancestor, et (2) que cliquer dessus appelle `onOpenChange(false)`
 * via la prop contrôlée mais NE pousse PAS `history.back()`.
 */
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { Eye } from "lucide-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockTriggerHaptic = vi.fn();
const mockHistoryBack = vi.fn();
const mockUseBackButtonClose = vi.fn();

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
	useHaptic:
		() =>
		(...args: unknown[]) =>
			mockTriggerHaptic(...args),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => true, // Force mobile render path (Drawer + Link, pas Dropdown).
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		onClick,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		onClick?: (e: React.MouseEvent) => void;
	} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a href={href} onClick={onClick} {...rest} data-testid="action-link">
			{children}
		</a>
	),
}));

// Spy : si Vaul's wrappedOnOpenChange est invoqué avec false, useBackButtonClose
// déclenche history.back(). On veut justement vérifier que ça N'arrive PAS.
vi.mock("@/shared/hooks/use-back-button-close", () => ({
	useBackButtonClose: (...args: unknown[]) => {
		mockUseBackButtonClose(...args);
		return {
			handleClose: () => mockHistoryBack(),
		};
	},
}));

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "../responsive-action-menu";

const SECTIONS: ActionMenuSection[] = [
	{
		key: "manage",
		items: [{ key: "view", label: "Voir le produit", icon: Eye, href: "/creations/test" }],
	},
];

function renderControlledMenu(onOpenChange: (open: boolean) => void) {
	return render(
		<ResponsiveActionMenu open={true} onOpenChange={onOpenChange}>
			<ResponsiveActionMenuTrigger render={<button type="button" />}>
				Trigger
			</ResponsiveActionMenuTrigger>
			<ResponsiveActionMenuContent title="Actions" sections={SECTIONS} />
		</ResponsiveActionMenu>,
	);
}

beforeEach(() => {
	mockTriggerHaptic.mockClear();
	mockHistoryBack.mockClear();
	mockUseBackButtonClose.mockClear();
});

afterEach(() => {
	cleanup();
});

describe("ResponsiveActionMenu — Link history.back race (regression locked)", () => {
	it("Link is NOT wrapped in a DrawerClose ancestor (regression: history.back race)", () => {
		renderControlledMenu(vi.fn());

		const link = screen.getByTestId("action-link");

		// Marqueur migré : Vaul posait `data-vaul-drawer-close`, Base UI ne pose
		// rien — c'est notre `data-slot` qui identifie le Close. Si le Link était
		// enveloppé, remonter le DOM depuis le <a> le rencontrerait.
		let node: HTMLElement | null = link;
		while (node) {
			expect(node.getAttribute("data-slot")).not.toBe("drawer-close");
			node = node.parentElement;
		}
	});

	it("clicking the Link calls onOpenChange(false) via the controlled prop, NOT history.back()", () => {
		const onOpenChange = vi.fn();
		renderControlledMenu(onOpenChange);

		const link = screen.getByTestId("action-link");
		fireEvent.click(link);

		// requestClose() set la prop `open=false` directement (contrôlé).
		expect(onOpenChange).toHaveBeenCalledWith(false);
		// Vaul wrappedOnOpenChange ne doit PAS avoir été invoqué → pas de history.back().
		expect(mockHistoryBack).not.toHaveBeenCalled();
	});

	it("fires haptic feedback on Link tap (light by default)", () => {
		renderControlledMenu(vi.fn());

		fireEvent.click(screen.getByTestId("action-link"));

		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});
});
