"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/utils/cn";
import { isInteractiveTarget } from "@/shared/utils/is-interactive-target";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "min(18rem, 85vw)";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
/** Cible de `aria-controls` du trigger — le rapport expanded/collapsed doit désigner un élément. */
const SIDEBAR_NAV_ID = "sidebar-nav";

type SidebarContextProps = {
	state: "expanded" | "collapsed";
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
	const context = React.use(SidebarContext);
	if (!context) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return context;
}

function SidebarProvider({
	defaultOpen = true,
	open: openProp,
	onOpenChange: setOpenProp,
	className,
	style,
	children,
	...props
}: React.ComponentProps<"div"> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = React.useState(false);
	// La live region ne doit annoncer qu'un CHANGEMENT d'état. Rendue dès le HTML
	// initial, elle faisait annoncer « Menu ouvert » à chaque chargement de page.
	const [hasToggled, setHasToggled] = React.useState(false);

	// This is the internal state of the sidebar.
	// We use openProp and setOpenProp for control from outside the component.
	const [_open, _setOpen] = React.useState(defaultOpen);
	const open = openProp ?? _open;
	const setOpen = (value: boolean | ((value: boolean) => boolean)) => {
		const openState = typeof value === "function" ? value(open) : value;
		if (setOpenProp) {
			setOpenProp(openState);
		} else {
			_setOpen(openState);
		}
		setHasToggled(true);

		// This sets the cookie to keep the sidebar state.
		const isSecure = window.location.protocol === "https:";
		document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax${isSecure ? "; Secure" : ""}`;
	};

	// Helper to toggle the sidebar.
	const toggleSidebar = () => {
		return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
	};

	// Effect Event: reads toggleSidebar without re-attaching the listener on isMobile changes
	const onKeyDown = React.useEffectEvent((event: KeyboardEvent) => {
		if (event.key !== SIDEBAR_KEYBOARD_SHORTCUT || !(event.metaKey || event.ctrlKey)) return;
		// Garde SSOT partagée avec `?` et la pagination : ⌘B ne doit pas replier la
		// navigation pendant une saisie (⌘B = gras dans un contenteditable).
		if (isInteractiveTarget(event.target)) return;
		event.preventDefault();
		toggleSidebar();
	});

	// Adds a keyboard shortcut to toggle the sidebar.
	React.useEffect(() => {
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// We add a state so that we can do data-state="expanded" or "collapsed".
	// This makes it easier to style the sidebar with Tailwind classes.
	const state = open ? "expanded" : "collapsed";

	const contextValue: SidebarContextProps = {
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar,
	};

	return (
		<SidebarContext.Provider value={contextValue}>
			<TooltipProvider delay={0}>
				<div
					data-slot="sidebar-wrapper"
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH,
							"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
							...style,
						} as React.CSSProperties
					}
					className={cn(
						"group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full",
						className,
					)}
					{...props}
				>
					{children}
				</div>
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					{hasToggled ? (state === "expanded" ? "Menu ouvert" : "Menu réduit") : ""}
				</div>
			</TooltipProvider>
		</SidebarContext.Provider>
	);
}

function Sidebar({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	disableMobileSheet = false,
	className,
	children,
	...props
}: React.ComponentProps<"div"> & {
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
	disableMobileSheet?: boolean;
}) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === "none") {
		return (
			<div
				data-slot="sidebar"
				className={cn(
					"bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	}

	if (isMobile) {
		if (disableMobileSheet) return null;
		return (
			<Sheet direction={side} open={openMobile} onOpenChange={setOpenMobile}>
				<SheetContent
					data-sidebar="sidebar"
					data-slot="sidebar"
					data-mobile="true"
					className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0"
					style={
						{
							"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
						} as React.CSSProperties
					}
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Menu de navigation</SheetTitle>
						<SheetDescription>Navigation principale du tableau de bord</SheetDescription>
					</SheetHeader>
					<div className="flex h-full w-full flex-col">{children}</div>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<nav
			id={SIDEBAR_NAV_ID}
			aria-label="Navigation principale du tableau de bord"
			className="group peer text-sidebar-foreground hidden md:block"
			data-state={state}
			data-collapsible={state === "collapsed" ? collapsible : ""}
			data-variant={variant}
			data-side={side}
			data-slot="sidebar"
		>
			{/* This is what handles the sidebar gap on desktop */}
			<div
				data-slot="sidebar-gap"
				className={cn(
					"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear motion-reduce:transition-none",
					"group-data-[collapsible=offcanvas]:w-0",
					"group-data-[side=right]:rotate-180",
					variant === "floating" || variant === "inset"
						? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing)*4)]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
				)}
			/>
			<div
				data-slot="sidebar-container"
				// En `offcanvas` replié, le conteneur est translaté hors écran mais reste
				// dans le DOM : sans `inert`, Tab traverse tous les liens invisibles
				// (WCAG 2.4.7). `inert` retire aussi le sous-arbre de l'arbre a11y.
				inert={state === "collapsed" && collapsible === "offcanvas"}
				className={cn(
					"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear motion-reduce:transition-none md:flex",
					side === "left"
						? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
						: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
					// Adjust the padding for floating and inset variants.
					variant === "floating" || variant === "inset"
						? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+var(--spacing)*4+2px)]"
						: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
					className,
				)}
				{...props}
			>
				<div
					data-sidebar="sidebar"
					data-slot="sidebar-inner"
					className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-md"
				>
					{children}
				</div>
			</div>
		</nav>
	);
}

function SidebarTrigger({ className, onClick, ...props }: React.ComponentProps<typeof Button>) {
	const { toggleSidebar, state } = useSidebar();

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon"
			aria-label={state === "expanded" ? "Masquer le menu" : "Afficher le menu"}
			aria-expanded={state === "expanded"}
			aria-controls={SIDEBAR_NAV_ID}
			className={cn("size-7 cursor-pointer", className)}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			<PanelLeftIcon />
			<span className="sr-only">
				{state === "expanded" ? "Masquer le menu" : "Afficher le menu"}
			</span>
		</Button>
	);
}

function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
	const { toggleSidebar, state } = useSidebar();

	return (
		<button
			type="button"
			data-sidebar="rail"
			data-slot="sidebar-rail"
			aria-label={state === "expanded" ? "Réduire la sidebar" : "Agrandir la sidebar"}
			aria-expanded={state === "expanded"}
			tabIndex={0}
			onClick={toggleSidebar}
			title={state === "expanded" ? "Réduire la sidebar" : "Agrandir la sidebar"}
			className={cn(
				"hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-[transform,background-color,opacity] ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 sm:flex",
				"can-hover:hover:bg-accent/10 focus-ring",
				"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
				"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
				"hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
				"[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
				"[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * Conteneur du contenu à droite de la sidebar.
 *
 * Volontairement un `<div>` et non un `<main>` : le seul consommateur
 * (`app/admin/layout.tsx`) niche son propre `<main id="admin-main-content">`
 * ciblé par le `SkipLink`. Deux `<main>` imbriqués (dont un `id="main-content"`
 * codé en dur, cible d'ancres et de `querySelector` globaux) est un défaut de
 * structure, pas une commodité.
 */
function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-inset"
			className={cn(
				"bg-background relative flex w-full flex-1 flex-col",
				"md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarInput({ className, ...props }: React.ComponentProps<typeof Input>) {
	return (
		<Input
			data-slot="sidebar-input"
			data-sidebar="input"
			className={cn("bg-background h-8 w-full shadow-none", className)}
			{...props}
		/>
	);
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-header"
			data-sidebar="header"
			className={cn("flex flex-col gap-2 p-2", className)}
			{...props}
		/>
	);
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-footer"
			data-sidebar="footer"
			className={cn("flex flex-col gap-2 p-2", className)}
			{...props}
		/>
	);
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
	return (
		<Separator
			data-slot="sidebar-separator"
			data-sidebar="separator"
			className={cn("bg-sidebar-border mx-2 w-auto", className)}
			{...props}
		/>
	);
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-content"
			data-sidebar="content"
			className={cn(
				"flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group"
			data-sidebar="group"
			className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
			{...props}
		/>
	);
}

function SidebarGroupLabel({
	className,
	render,
	...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">(
			{
				className: cn(
					"text-sidebar-muted-foreground ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-light tracking-wide outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 motion-reduce:transition-none [&>svg]:size-3.5 [&>svg]:shrink-0",
					"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
					className,
				),
			},
			props,
		),
		render,
		state: { slot: "sidebar-group-label", sidebar: "group-label" },
	});
}

function SidebarGroupAction({
	className,
	render,
	...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				type: "button",
				className: cn(
					"text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
					// Increases the hit area of the button on mobile.
					"after:absolute after:-inset-2 md:after:hidden",
					"group-data-[collapsible=icon]:hidden",
					className,
				),
			},
			props,
		),
		render,
		state: { slot: "sidebar-group-action", sidebar: "group-action" },
	});
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group-content"
			data-sidebar="group-content"
			className={cn("w-full text-sm", className)}
			{...props}
		/>
	);
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu"
			data-sidebar="menu"
			className={cn("flex w-full min-w-0 flex-col gap-1", className)}
			{...props}
		/>
	);
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-item"
			data-sidebar="menu-item"
			className={cn("group/menu-item relative", className)}
			{...props}
		/>
	);
}

const sidebarMenuButtonVariants = cva(
	"peer/menu-button relative flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-hidden ring-sidebar-ring transition-[background-color,color,padding-left] duration-300 ease-out motion-reduce:transition-none hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:pl-3 focus-visible:ring-2 active:bg-sidebar-accent/50 active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:pl-3 data-active:font-semibold data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:-translate-y-1/2 data-active:before:h-5 data-active:before:w-0.5 data-active:before:bg-primary data-active:before:rounded-full data-[state=open]:hover:bg-sidebar-accent/50 data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! group-data-[collapsible=icon]:hover:pl-2! [&>span:last-child]:truncate [&>svg]:shrink-0 font-medium cursor-pointer",
	{
		variants: {
			variant: {
				default: "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
				outline:
					"bg-background shadow-[0_0_0_1px_oklch(var(--sidebar-border))] hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_oklch(var(--sidebar-accent))]",
			},
			size: {
				default: "h-9 text-sm [&>svg]:size-5",
				sm: "h-8 text-xs [&>svg]:size-4",
				lg: "h-12 text-sm [&>svg]:size-5 group-data-[collapsible=icon]:p-0!",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function SidebarMenuButton({
	render,
	isActive = false,
	variant = "default",
	size = "default",
	tooltip,
	className,
	...props
}: useRender.ComponentProps<"button"> &
	React.ComponentProps<"button"> & {
		isActive?: boolean;
		tooltip?: string | React.ComponentProps<typeof TooltipContent>;
	} & VariantProps<typeof sidebarMenuButtonVariants>) {
	const { isMobile, state } = useSidebar();

	const button = useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{ className: cn(sidebarMenuButtonVariants({ variant, size }), className) },
			props,
		),
		render,
		state: {
			slot: "sidebar-menu-button",
			sidebar: "menu-button",
			size,
			active: isActive,
		},
	});

	if (!tooltip) {
		return button;
	}

	if (typeof tooltip === "string") {
		tooltip = {
			children: tooltip,
		};
	}

	return (
		<Tooltip>
			<TooltipTrigger render={button} />
			<TooltipContent
				side="right"
				align="center"
				hidden={state !== "collapsed" || isMobile}
				{...tooltip}
			/>
		</Tooltip>
	);
}

function SidebarMenuAction({
	className,
	render,
	showOnHover = false,
	...props
}: useRender.ComponentProps<"button"> &
	React.ComponentProps<"button"> & {
		showOnHover?: boolean;
	}) {
	return useRender({
		defaultTagName: "button",
		props: mergeProps<"button">(
			{
				type: "button",
				className: cn(
					"text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
					// Increases the hit area of the button on mobile.
					"after:absolute after:-inset-2 md:after:hidden",
					"peer-data-[size=sm]/menu-button:top-1",
					"peer-data-[size=default]/menu-button:top-1.5",
					"peer-data-[size=lg]/menu-button:top-2.5",
					"group-data-[collapsible=icon]:hidden",
					showOnHover &&
						"peer-data-active/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
					className,
				),
			},
			props,
		),
		render,
		state: { slot: "sidebar-menu-action", sidebar: "menu-action" },
	});
}

function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-menu-badge"
			data-sidebar="menu-badge"
			className={cn(
				"text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none",
				"peer-hover/menu-button:text-sidebar-accent-foreground peer-data-active/menu-button:text-sidebar-accent-foreground",
				"peer-data-[size=sm]/menu-button:top-1",
				"peer-data-[size=default]/menu-button:top-1.5",
				"peer-data-[size=lg]/menu-button:top-2.5",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarMenuSub({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu-sub"
			data-sidebar="menu-sub"
			className={cn(
				"border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5",
				"group-data-[collapsible=icon]:hidden",
				className,
			)}
			{...props}
		/>
	);
}

function SidebarMenuSubItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-sub-item"
			data-sidebar="menu-sub-item"
			className={cn("group/menu-sub-item relative", className)}
			{...props}
		/>
	);
}

function SidebarMenuSubButton({
	size = "md",
	isActive = false,
	className,
	render,
	...props
}: useRender.ComponentProps<"a"> &
	React.ComponentProps<"a"> & {
		size?: "sm" | "md";
		isActive?: boolean;
	}) {
	return useRender({
		defaultTagName: "a",
		props: mergeProps<"a">(
			{
				className: cn(
					"text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground active:bg-sidebar-accent/50 active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground relative flex h-9 min-w-0 cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 font-medium outline-hidden transition-[background-color,color] duration-300 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:transition-none [&>span:last-child]:truncate [&>svg]:shrink-0",
					// Style actif : barre verticale gauche rose + font-semibold
					"data-active:before:bg-primary data-active:font-semibold data-active:before:absolute data-active:before:top-1/2 data-active:before:left-0 data-active:before:h-5 data-active:before:w-0.5 data-active:before:-translate-y-1/2 data-active:before:rounded-full",
					size === "sm" && "text-xs [&>svg]:size-4",
					size === "md" && "text-sm [&>svg]:size-5",
					"group-data-[collapsible=icon]:hidden",
					className,
				),
			},
			props,
		),
		render,
		state: {
			slot: "sidebar-menu-sub-button",
			sidebar: "menu-sub-button",
			size,
			active: isActive,
		},
	});
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarSeparator,
	SidebarTrigger,
	// Exporté pour que la layout admin relise la préférence côté serveur
	// (`SidebarProvider defaultOpen`) — sinon l'état replié est perdu au reload.
	SIDEBAR_COOKIE_NAME,
	useSidebar,
};
