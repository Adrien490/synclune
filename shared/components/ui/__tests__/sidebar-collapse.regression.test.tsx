/**
 * @regression sidebar-collapse-focus-and-shortcut
 *
 * Verrouille trois corrections de l'audit « Admin : shell & navigation » :
 *
 * 1. **Fuite de focus en `offcanvas` replié.** Le conteneur est translaté hors
 *    écran mais reste dans le DOM. Sans `inert`, Tab traversait tous les liens
 *    invisibles (WCAG 2.4.7).
 * 2. **⌘B pendant une saisie.** Le listener global n'avait aucune garde, contrairement
 *    à `?` et à la pagination — ⌘B repliait la navigation en pleine frappe.
 * 3. **Live region annoncée au chargement.** Le texte était rendu dans le HTML initial,
 *    donc « Menu ouvert » était annoncé à chaque navigation admin.
 *
 * Toute modification requiert une review explicite.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseIsMobile } = vi.hoisted(() => ({
	mockUseIsMobile: vi.fn(() => false),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: mockUseIsMobile,
}));

import { Sidebar, SidebarProvider, SidebarTrigger } from "../sidebar";

function renderSidebar(collapsible: "icon" | "offcanvas", defaultOpen: boolean) {
	return render(
		<SidebarProvider defaultOpen={defaultOpen}>
			<Sidebar collapsible={collapsible}>
				{/* Stand-in focusable : seule la traversée Tab compte, pas la cible, d'où
				    une adresse hors application. Un `href` de page réelle déclencherait
				    `no-html-link-for-pages`, un `next/link` exigerait un App Router monté,
				    et `#` n'est pas navigable (`jsx-a11y/anchor-is-valid`). */}
				<a href="https://example.test/commandes">Commandes</a>
			</Sidebar>
			<SidebarTrigger />
		</SidebarProvider>,
	);
}

function container() {
	return document.querySelector('[data-slot="sidebar-container"]');
}

beforeEach(() => {
	vi.clearAllMocks();
	mockUseIsMobile.mockReturnValue(false);
	document.cookie = "sidebar_state=; path=/; max-age=0";
});

afterEach(cleanup);

describe("Sidebar — fuite de focus en offcanvas replié", () => {
	it("pose inert sur le conteneur quand offcanvas est replié", () => {
		renderSidebar("offcanvas", false);
		expect(container()).toHaveAttribute("inert");
	});

	it("ne pose pas inert quand offcanvas est déplié", () => {
		renderSidebar("offcanvas", true);
		expect(container()).not.toHaveAttribute("inert");
	});

	it("ne pose JAMAIS inert en mode icon — le rail replié reste cliquable et focusable", () => {
		renderSidebar("icon", false);
		expect(container()).not.toHaveAttribute("inert");
	});
});

/** Dispatch ⌘B depuis `target` (remonte jusqu'à window via bubbles). */
function pressMetaB(target: EventTarget) {
	act(() => {
		target.dispatchEvent(new KeyboardEvent("keydown", { key: "b", metaKey: true, bubbles: true }));
	});
}

describe("Sidebar — garde de saisie sur ⌘B", () => {
	// Ce cas positif est le garde-fou des deux suivants : sans lui, « reste
	// expanded » serait vert même si le raccourci ne marchait pas du tout.
	it("replie la sidebar quand le focus n'est pas dans un champ", () => {
		renderSidebar("icon", true);
		const nav = document.querySelector('[data-slot="sidebar"]');
		expect(nav).toHaveAttribute("data-state", "expanded");

		pressMetaB(document.body);

		expect(nav).toHaveAttribute("data-state", "collapsed");
	});

	it("ignore ⌘B quand la cible est un champ de saisie", () => {
		renderSidebar("icon", true);
		const nav = document.querySelector('[data-slot="sidebar"]');

		const input = document.createElement("input");
		document.body.appendChild(input);
		pressMetaB(input);

		expect(nav).toHaveAttribute("data-state", "expanded");
		input.remove();
	});

	it("ignore ⌘B dans un contenteditable", () => {
		renderSidebar("icon", true);
		const nav = document.querySelector('[data-slot="sidebar"]');

		const editable = document.createElement("div");
		// jsdom ne dérive pas isContentEditable de l'attribut contenteditable
		Object.defineProperty(editable, "isContentEditable", { value: true });
		document.body.appendChild(editable);
		pressMetaB(editable);

		expect(nav).toHaveAttribute("data-state", "expanded");
		editable.remove();
	});

	it("ignore ⌘B dans un <select> (les touches y pilotent la sélection)", () => {
		renderSidebar("icon", true);
		const nav = document.querySelector('[data-slot="sidebar"]');

		const select = document.createElement("select");
		document.body.appendChild(select);
		pressMetaB(select);

		expect(nav).toHaveAttribute("data-state", "expanded");
		select.remove();
	});
});

describe("Sidebar — live region", () => {
	it("reste vide au premier rendu (pas d'annonce au chargement de page)", () => {
		renderSidebar("icon", true);
		const live = document.querySelector('[aria-live="polite"][aria-atomic="true"]');
		expect(live).toBeInTheDocument();
		expect(live).toHaveTextContent("");
	});

	it("annonce l'état seulement après un basculement explicite", async () => {
		const { default: userEventDefault } = await import("@testing-library/user-event");
		const user = userEventDefault.setup();
		renderSidebar("icon", true);

		await user.click(screen.getByRole("button", { name: /Masquer le menu/i }));

		const live = document.querySelector('[aria-live="polite"][aria-atomic="true"]');
		expect(live).toHaveTextContent("Menu réduit");
	});
});

describe("SidebarTrigger — rapport expanded/collapsed", () => {
	it("désigne la navigation via aria-controls", () => {
		renderSidebar("icon", true);
		const trigger = screen.getByRole("button", { name: /Masquer le menu/i });
		const controlledId = trigger.getAttribute("aria-controls");

		expect(controlledId).toBeTruthy();
		expect(document.getElementById(controlledId as string)).toBe(
			document.querySelector('[data-slot="sidebar"]'),
		);
	});
});
