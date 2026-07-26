import { Eye, Pencil, Trash2 } from "lucide-react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionMenuSection } from "@/shared/components/responsive-action-menu";

const { mockHaptic } = vi.hoisted(() => ({
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// Local mock that honors the `open` prop so we can assert visibility transitions.
vi.mock("@/shared/components/responsive-action-menu", () => {
	type Item = {
		key: string;
		label: string;
		icon?: unknown;
		variant?: "default" | "destructive";
		disabled?: boolean;
		hidden?: boolean;
		onSelect?: () => void;
		href?: string;
		external?: boolean;
	};
	type Section = { key: string; label?: string; items: Item[] };

	function ResponsiveActionMenu({
		open,
		children,
	}: {
		open?: boolean;
		onOpenChange?: (o: boolean) => void;
		children: React.ReactNode;
	}) {
		if (!open) return null;
		return <>{children}</>;
	}
	function ResponsiveActionMenuContent({
		title,
		sections,
	}: {
		title: string;
		description?: string;
		sections: Section[];
	}) {
		return (
			<div role="menu" aria-label={title}>
				{sections.map((section) => {
					const visible = section.items.filter((it) => !it.hidden);
					if (visible.length === 0) return null;
					return (
						<div key={section.key} data-section={section.key}>
							{visible.map((item) =>
								item.href ? (
									<a key={item.key} role="menuitem" href={item.href} data-variant={item.variant}>
										{item.label}
									</a>
								) : (
									<button
										key={item.key}
										type="button"
										role="menuitem"
										onClick={item.onSelect}
										data-variant={item.variant}
										aria-disabled={item.disabled === true ? true : undefined}
									>
										{item.label}
									</button>
								),
							)}
						</div>
					);
				})}
			</div>
		);
	}
	return { ResponsiveActionMenu, ResponsiveActionMenuContent };
});

import { LongPressMenuLink } from "../long-press-menu-link";

const SECTIONS: ActionMenuSection[] = [
	{
		key: "manage",
		items: [
			{ key: "view", label: "Voir", icon: Eye, href: "/admin/items/1" },
			{ key: "edit", label: "Modifier", icon: Pencil, onSelect: vi.fn() },
		],
	},
	{
		key: "danger",
		items: [
			{
				key: "delete",
				label: "Supprimer",
				icon: Trash2,
				variant: "destructive",
				onSelect: vi.fn(),
			},
		],
	},
];

function touch(x: number, y: number) {
	return [{ clientX: x, clientY: y } as Touch];
}

describe("LongPressMenuLink", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders the Link with href + aria-label", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/42"
				ariaLabel="Item 42"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card content</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 42" });
		expect(link).toHaveAttribute("href", "/admin/items/42");
	});

	it("does not render the menu before long-press (open=false)", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("opens the menu after a 500ms hold and renders sections", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
				menuDescription="Card 1"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.touchStart(link, { touches: touch(10, 10) });
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(screen.getByRole("menu", { name: "Actions" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Voir" })).toHaveAttribute(
			"href",
			"/admin/items/1",
		);
		expect(screen.getByRole("menuitem", { name: "Modifier" })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: "Supprimer" })).toHaveAttribute(
			"data-variant",
			"destructive",
		);
		expect(mockHaptic).toHaveBeenCalledWith("medium");
	});

	it("opens the menu via the ContextMenu key (keyboard escape hatch)", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.keyDown(link, { key: "ContextMenu" });

		expect(screen.getByRole("menu", { name: "Actions" })).toBeInTheDocument();
	});

	/**
	 * @regression no-haptic-on-keyboard-path
	 * Les raccourcis `ContextMenu` / `Shift+F10` sont le chemin CLAVIER d'ouverture
	 * du menu. Ils émettaient un `haptic("medium")` — un retour tactile sur une
	 * entrée qui n'est pas tactile. Le retour haptique reste réservé au doigt
	 * (long-press, tap).
	 */
	it.each([
		["ContextMenu", { key: "ContextMenu" }],
		["Shift+F10", { key: "F10", shiftKey: true }],
	])("does not fire any haptic when the menu is opened with %s", (_label, keyInit) => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.keyDown(link, keyInit);

		expect(screen.getByRole("menu", { name: "Actions" })).toBeInTheDocument();
		expect(mockHaptic).not.toHaveBeenCalled();
	});

	it("opens the menu via Shift+F10 (keyboard escape hatch)", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.keyDown(link, { key: "F10", shiftKey: true });

		expect(screen.getByRole("menu", { name: "Actions" })).toBeInTheDocument();
	});

	it("does NOT open the menu on unrelated key presses", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.keyDown(link, { key: "F10" }); // sans shift
		fireEvent.keyDown(link, { key: "Enter" });

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("cancels long-press on >10px movement (scroll detection)", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.touchStart(link, { touches: touch(50, 50) });
		fireEvent.touchMove(link, { touches: touch(50, 80) });
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("post-long-press synthetic click is suppressed (no Link navigation)", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.touchStart(link, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});
		fireEvent.touchEnd(link);

		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		const defaultAllowed = link.dispatchEvent(click);

		// preventDefault() called inside the hook → defaultAllowed === false
		expect(defaultAllowed).toBe(false);
	});

	it("plain tap (no hold) does NOT open the menu", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.touchStart(link, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(100);
		});
		fireEvent.touchEnd(link);

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("fires haptic exactly once on threshold (no double-haptic)", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.touchStart(link, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(mockHaptic).toHaveBeenCalledTimes(1);
		expect(mockHaptic).toHaveBeenCalledWith("medium");
	});

	it("hidden items are filtered out of the rendered menu", () => {
		const sections: ActionMenuSection[] = [
			{
				key: "manage",
				items: [
					{ key: "edit", label: "Modifier", onSelect: vi.fn() },
					{ key: "duplicate", label: "Dupliquer", onSelect: vi.fn(), hidden: true },
				],
			},
		];
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={sections}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		fireEvent.touchStart(link, { touches: touch(0, 0) });
		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(screen.getByRole("menuitem", { name: "Modifier" })).toBeInTheDocument();
		expect(screen.queryByRole("menuitem", { name: "Dupliquer" })).not.toBeInTheDocument();
	});

	/**
	 * @regression long-press-affordance-by-default
	 * L'indice visuel était un prop facultatif — construit, testé, documenté, et
	 * passé par ZÉRO des 10 listes admin mobiles. Le menu d'actions n'y était donc
	 * atteignable que par un appui long de 500 ms que rien n'annonçait. Un
	 * mécanisme de découvrabilité qu'il faut penser à activer ne l'est jamais : il
	 * est rendu par défaut, et son retrait doit être explicite.
	 */
	it("renders a default affordance when the consumer passes none", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		const affordance = link.querySelector("svg[aria-hidden='true']");
		expect(affordance).not.toBeNull();
		// Purement visuel : ne doit jamais intercepter le tap ni être annoncé.
		expect(affordance).toHaveClass("pointer-events-none");
		// Réserve d'espace, sinon l'indice absolute chevauche le contenu de la carte.
		expect(link).toHaveClass("pr-5");
	});

	it("allows opting out of the affordance with an explicit null", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
				affordance={null}
			>
				<span>card</span>
			</LongPressMenuLink>,
		);

		const link = screen.getByRole("link", { name: "Item 1" });
		expect(link.querySelector("svg[aria-hidden='true']")).toBeNull();
		expect(link).not.toHaveClass("pr-5");
	});

	it("renders the optional affordance slot inside the Link wrapper", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
				affordance={<span data-testid="custom-affordance">…</span>}
			>
				<span>card</span>
			</LongPressMenuLink>,
		);
		const link = screen.getByRole("link", { name: "Item 1" });
		expect(link).toContainElement(screen.getByTestId("custom-affordance"));
	});

	it("injects touch-action: manipulation + user-select: none on the Link", () => {
		render(
			<LongPressMenuLink
				href="/admin/items/1"
				ariaLabel="Item 1"
				sections={SECTIONS}
				menuTitle="Actions"
			>
				<span>card</span>
			</LongPressMenuLink>,
		);
		const link = screen.getByRole("link", { name: "Item 1" });
		expect(link.style.touchAction).toBe("manipulation");
		expect(link.style.userSelect).toBe("none");
	});
});
