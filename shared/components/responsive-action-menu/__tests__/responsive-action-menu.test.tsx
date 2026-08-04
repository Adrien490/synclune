import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ArchiveIcon, EyeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/ssr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockTriggerHaptic = vi.fn();
const mockUseIsMobile = vi.fn(() => false);

vi.mock("@/shared/hooks/use-haptic", () => ({
	triggerHaptic: (...args: unknown[]) => mockTriggerHaptic(...args),
	useHaptic:
		() =>
		(...args: unknown[]) =>
			mockTriggerHaptic(...args),
}));

vi.mock("@/shared/hooks/use-mobile", () => ({
	useIsMobile: () => mockUseIsMobile(),
}));

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
	} & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/hooks/use-back-button-close", () => ({
	useBackButtonClose: ({ onClose }: { onClose: () => void }) => ({
		handleClose: () => onClose(),
	}),
}));

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "../responsive-action-menu";

function buildSections(opts: { includeHidden?: boolean } = {}): ActionMenuSection[] {
	return [
		{
			key: "manage",
			items: [
				{ key: "view", label: "Voir", icon: EyeIcon, href: "/creations/test", external: true },
				{ key: "edit", label: "Modifier", icon: PencilSimpleIcon, onSelect: vi.fn() },
				...(opts.includeHidden
					? [{ key: "hidden", label: "Caché", onSelect: vi.fn(), hidden: true as const }]
					: []),
			],
		},
		{
			key: "status",
			label: "Statut",
			items: [{ key: "archive", label: "Archiver", icon: ArchiveIcon, onSelect: vi.fn() }],
		},
		{
			key: "danger",
			items: [
				{
					key: "delete",
					label: "Supprimer",
					description: "Action irréversible",
					icon: TrashIcon,
					variant: "destructive" as const,
					onSelect: vi.fn(),
				},
			],
		},
	];
}

afterEach(() => {
	cleanup();
	mockTriggerHaptic.mockReset();
});

describe("ResponsiveActionMenu — desktop", () => {
	beforeEach(() => {
		mockUseIsMobile.mockReturnValue(false);
	});

	it("renders a Radix DropdownMenu trigger and opens on click", async () => {
		const user = userEvent.setup();
		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");

		expect(screen.getByRole("menu")).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: /Modifier/ })).toBeInTheDocument();
		expect(screen.getByRole("menuitem", { name: /Supprimer/ })).toBeInTheDocument();
	});

	it("fires haptic `selection` when the trigger is tapped", async () => {
		const user = userEvent.setup();
		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");

		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	it("skips hidden items and empty sections", async () => {
		const user = userEvent.setup();
		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions"
					sections={buildSections({ includeHidden: true })}
				/>
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");

		expect(screen.queryByText("Caché")).not.toBeInTheDocument();
	});

	it("calls onSelect and fires `medium` haptic on destructive item", async () => {
		const user = userEvent.setup();
		const onDelete = vi.fn();
		const sections = buildSections();
		sections[2]!.items[0] = {
			key: "delete",
			label: "Supprimer",
			icon: TrashIcon,
			variant: "destructive",
			onSelect: onDelete,
		};

		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");
		await user.click(screen.getByRole("menuitem", { name: /Supprimer/ }));

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("renders link-style items with href", async () => {
		const user = userEvent.setup();
		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");
		const link = screen.getByRole("menuitem", { name: /Voir/ });
		expect(link.getAttribute("href") ?? link.querySelector("a")?.getAttribute("href")).toBe(
			"/creations/test",
		);
	});

	it("fires onSelect + haptic when activating an item with Enter key", async () => {
		const user = userEvent.setup();
		const onEdit = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [{ key: "edit", label: "Modifier", icon: PencilSimpleIcon, onSelect: onEdit }],
			},
		];

		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");
		mockTriggerHaptic.mockClear();

		// Base UI garde le focus DOM sur le popup et surligne l'item courant
		// (`aria-activedescendant`) : `item.focus()` ne désigne plus la cible du
		// clavier. On emprunte le vrai chemin utilisateur.
		await user.keyboard("{ArrowDown}{Enter}");

		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});

	it("closes the menu when pressing Escape", async () => {
		const user = userEvent.setup();
		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");
		expect(screen.getByRole("menu")).toBeInTheDocument();

		await user.keyboard("{Escape}");

		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});

	it("blocks pending items (does not fire onSelect)", async () => {
		const user = userEvent.setup();
		const onDuplicate = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [
					{
						key: "duplicate",
						label: "Dupliquer",
						icon: PencilSimpleIcon,
						onSelect: onDuplicate,
						pending: true,
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");
		const item = screen.getByRole("menuitem", { name: /Dupliquer/ });
		expect(item).toHaveAttribute("aria-busy", "true");
	});

	it("renders sr-only keyboard instructions", async () => {
		const user = userEvent.setup();
		render(
			<ResponsiveActionMenu>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		await user.click(screen.getByRole("button", { name: "Actions" }));
		// Base UI monte le popup de façon asynchrone (Radix le faisait dans le même
		// tick) : attendre le menu avant toute assertion synchrone.
		await screen.findByRole("menu");
		expect(
			screen.getByText(/Utilisez les flèches pour naviguer/i, { selector: "span.sr-only" }),
		).toBeInTheDocument();
	});
});

describe("ResponsiveActionMenu — mobile", () => {
	beforeEach(() => {
		mockUseIsMobile.mockReturnValue(true);
	});

	it("renders a Vaul Drawer with the sheet title and all actions", () => {
		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent
					title="Actions"
					description="Bague Rose Cendrée"
					sections={buildSections()}
				/>
			</ResponsiveActionMenu>,
		);

		const menu = screen.getByRole("menu", { name: "Actions" });
		expect(menu).toBeInTheDocument();
		expect(screen.getByText("Bague Rose Cendrée")).toBeInTheDocument();
		expect(within(menu).getByRole("menuitem", { name: /Modifier/ })).toBeInTheDocument();
		expect(within(menu).getByRole("menuitem", { name: /Supprimer/ })).toBeInTheDocument();
	});

	it("renders the uppercase section label when provided", () => {
		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		expect(screen.getByText("Statut")).toBeInTheDocument();
	});

	it("renders an 'Annuler' button in the sticky footer", () => {
		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
	});

	it("fires haptic and onSelect when a mobile row is tapped", () => {
		const onEdit = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [{ key: "edit", label: "Modifier", icon: PencilSimpleIcon, onSelect: onEdit }],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		fireEvent.click(screen.getByRole("menuitem", { name: /Modifier/ }));

		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});

	it("uses `medium` haptic on destructive mobile actions", () => {
		const onDelete = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "danger",
				items: [
					{
						key: "delete",
						label: "Supprimer",
						icon: TrashIcon,
						variant: "destructive",
						onSelect: onDelete,
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		fireEvent.click(screen.getByRole("menuitem", { name: /Supprimer/ }));

		expect(onDelete).toHaveBeenCalled();
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("announces the action count via an aria-live region", () => {
		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		const live = screen.getByText(/4 actions disponibles/);
		expect(live).toHaveAttribute("aria-live", "polite");
		expect(live).toHaveAttribute("role", "status");
	});

	it("exposes focus-visible styles on the menuitem button (not on the inner span)", () => {
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [{ key: "edit", label: "Modifier", icon: PencilSimpleIcon, onSelect: vi.fn() }],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		const item = screen.getByRole("menuitem", { name: /Modifier/ });
		expect(item.className).toMatch(/focus-visible:ring-ring/);
		expect(item.className).toMatch(/focus-visible:ring-2/);
	});

	it("fires haptic `selection` when the overlay/scrim is tapped", () => {
		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		const overlay = document.querySelector('[data-slot="drawer-overlay"]');
		expect(overlay).not.toBeNull();
		fireEvent.click(overlay as Element);

		expect(mockTriggerHaptic).toHaveBeenCalledWith("selection");
	});

	it("fires haptic `light` when tapping the Annuler button", () => {
		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={buildSections()} />
			</ResponsiveActionMenu>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});

	it("blocks pending rows: no haptic, no onSelect, aria-busy set", () => {
		const onDuplicate = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [
					{
						key: "duplicate",
						label: "Dupliquer",
						icon: PencilSimpleIcon,
						onSelect: onDuplicate,
						pending: true,
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		const item = screen.getByRole("menuitem", { name: /Dupliquer/ });
		expect(item).toHaveAttribute("aria-busy", "true");
		expect(item).toBeDisabled();

		fireEvent.click(item);
		expect(onDuplicate).not.toHaveBeenCalled();
		expect(mockTriggerHaptic).not.toHaveBeenCalled();
	});

	it("closesMenu defaults to true: mobile button row is wrapped in DrawerClose (data-slot)", () => {
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [{ key: "edit", label: "Modifier", icon: PencilSimpleIcon, onSelect: vi.fn() }],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		const item = screen.getByRole("menuitem", { name: /Modifier/ });
		expect(item).toHaveAttribute("data-slot", "drawer-close");
	});

	it("closesMenu=false: mobile button row is NOT wrapped in DrawerClose (parent drawer stays open)", () => {
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [
					{
						key: "delete",
						label: "Supprimer",
						icon: TrashIcon,
						variant: "destructive",
						closesMenu: false,
						onSelect: vi.fn(),
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		const item = screen.getByRole("menuitem", { name: /Supprimer/ });
		expect(item).not.toHaveAttribute("data-slot", "drawer-close");
	});

	it("closesMenu=false still fires onSelect and haptic on tap", () => {
		const onSelect = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [
					{
						key: "delete",
						label: "Supprimer",
						icon: TrashIcon,
						variant: "destructive",
						closesMenu: false,
						onSelect,
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		fireEvent.click(screen.getByRole("menuitem", { name: /Supprimer/ }));
		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("medium");
	});

	it("href row is NOT wrapped in DrawerClose (prevents history.back ↔ router.push race)", () => {
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [{ key: "view", label: "Voir", icon: EyeIcon, href: "/creations/test" }],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		const item = screen.getByRole("menuitem", { name: /Voir/ });
		expect(item).not.toHaveAttribute("data-slot", "drawer-close");
		expect(item.tagName).toBe("A");
		expect(item).toHaveAttribute("href", "/creations/test");
	});

	it("href row closes the menu via the controlled `onOpenChange` prop (no Vaul round-trip)", () => {
		const onOpenChange = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [{ key: "view", label: "Voir", icon: EyeIcon, href: "/creations/test" }],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={onOpenChange}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		fireEvent.click(screen.getByRole("menuitem", { name: /Voir/ }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(mockTriggerHaptic).toHaveBeenCalledWith("light");
	});

	it("href row with closesMenu=false does NOT call onOpenChange", () => {
		const onOpenChange = vi.fn();
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [
					{
						key: "view",
						label: "Voir",
						icon: EyeIcon,
						href: "/creations/test",
						closesMenu: false,
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={onOpenChange}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		fireEvent.click(screen.getByRole("menuitem", { name: /Voir/ }));
		expect(onOpenChange).not.toHaveBeenCalled();
	});

	it("guards disabled href items (preventDefault + tabIndex=-1)", () => {
		const sections: ActionMenuSection[] = [
			{
				key: "x",
				items: [
					{
						key: "view",
						label: "Voir",
						icon: EyeIcon,
						href: "/creations/test",
						disabled: true,
					},
				],
			},
		];

		render(
			<ResponsiveActionMenu open onOpenChange={() => {}}>
				<ResponsiveActionMenuTrigger render={<button type="button" />}>
					Actions
				</ResponsiveActionMenuTrigger>
				<ResponsiveActionMenuContent title="Actions" sections={sections} />
			</ResponsiveActionMenu>,
		);

		const link = screen.getByRole("menuitem", { name: /Voir/ });
		expect(link).toHaveAttribute("tabindex", "-1");
		expect(link).toHaveAttribute("aria-disabled", "true");

		mockTriggerHaptic.mockClear();
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		link.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
		expect(mockTriggerHaptic).not.toHaveBeenCalled();
	});
});
