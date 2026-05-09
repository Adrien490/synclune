"use client";

import * as React from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

export type ResponsiveAlertTone = "destructive" | "warning" | "info" | "success" | "neutral";

type ResponsiveCtx = {
	isMobile: boolean;
	tone: ResponsiveAlertTone;
};

const Ctx = React.createContext<ResponsiveCtx | null>(null);

function useResponsiveAlert(component: string): ResponsiveCtx {
	const ctx = React.useContext(Ctx);
	if (!ctx) {
		throw new Error(
			`${component} must be used inside <ResponsiveAlertDialog>. ` +
				`Wrap your tree with <ResponsiveAlertDialog open onOpenChange>.`,
		);
	}
	return ctx;
}

const TONE_CIRCLE_CLASSES: Record<ResponsiveAlertTone, string> = {
	destructive: "bg-destructive/10 ring-destructive/20 text-destructive",
	warning: "bg-amber-500/10 ring-amber-500/20 text-amber-600 dark:text-amber-400",
	info: "bg-sky-500/10 ring-sky-500/20 text-sky-600 dark:text-sky-400",
	success: "bg-emerald-500/10 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400",
	neutral: "bg-muted ring-border text-muted-foreground",
};

const TONE_ACTION_CLASSES: Record<ResponsiveAlertTone, string> = {
	destructive: "bg-destructive text-white hover:bg-destructive/90",
	warning: "bg-amber-600 text-white hover:bg-amber-700",
	info: "",
	success: "bg-emerald-600 text-white hover:bg-emerald-700",
	neutral: "",
};

const TONE_HAPTIC: Record<ResponsiveAlertTone, "heavy" | "medium" | "light" | "success"> = {
	destructive: "heavy",
	warning: "medium",
	info: "light",
	success: "success",
	neutral: "medium",
};

type RootProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: React.ReactNode;
	/**
	 * Tonalité visuelle de l'alerte. Pilote la couleur du hero icon, de l'action button,
	 * et le pattern haptic (heavy pour destructive, success pour validation, etc.).
	 * @default "neutral"
	 */
	tone?: ResponsiveAlertTone;
	/**
	 * Si false, désactive swipe-down + tap-overlay sur mobile (Vaul `dismissible={false}`).
	 * Par défaut suit la tonalité : destructive → false (sécurité), autres → true.
	 */
	dismissible?: boolean;
};

/**
 * AlertDialog responsive : Vaul Drawer (bottom, hero icon, padding généreux) sur mobile,
 * Radix AlertDialog (centré) sur desktop.
 *
 * Sur mobile, le rendu suit un pattern iOS 26 : hero icon centré dans cercle tinted,
 * titre bold court, description compacte text-balance, 2 boutons full-width empilés
 * (action en haut h-12 rounded-xl, cancel ghost en dessous). Les actions destructives
 * désactivent par défaut le swipe-down et le tap-overlay (Vaul `dismissible={false}`).
 */
function ResponsiveAlertDialog({
	open,
	onOpenChange,
	children,
	tone = "neutral",
	dismissible,
}: RootProps) {
	const isMobile = useIsMobile();
	const value = React.useMemo(() => ({ isMobile, tone }), [isMobile, tone]);

	const isDismissible = dismissible ?? tone !== "destructive";

	return (
		<Ctx.Provider value={value}>
			{isMobile ? (
				<Drawer open={open} onOpenChange={onOpenChange} dismissible={isDismissible}>
					{children}
				</Drawer>
			) : (
				<AlertDialog open={open} onOpenChange={onOpenChange}>
					{children}
				</AlertDialog>
			)}
		</Ctx.Provider>
	);
}

function ResponsiveAlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogTrigger>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogTrigger");
	return isMobile ? <DrawerTrigger {...props} /> : <AlertDialogTrigger {...props} />;
}

function ResponsiveAlertDialogContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogContent>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogContent");
	if (isMobile) {
		return (
			<DrawerContent className={cn("flex max-h-[88vh] flex-col px-5 pb-2", className)}>
				{children}
			</DrawerContent>
		);
	}
	return (
		<AlertDialogContent className={className} {...props}>
			{children}
		</AlertDialogContent>
	);
}

/**
 * Hero icon affiché en haut du dialog mobile (centré, cercle tinted selon tonalité).
 * Sur desktop, retourne `null` — l'AlertDialog Radix ne porte pas de hero icon.
 */
function ResponsiveAlertDialogHeroIcon({
	icon: Icon,
	className,
}: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
	className?: string;
}) {
	const { isMobile, tone } = useResponsiveAlert("ResponsiveAlertDialogHeroIcon");
	if (!isMobile) return null;
	return (
		<div
			className={cn(
				"mx-auto mt-2 mb-1 grid size-14 place-items-center rounded-full ring-1",
				TONE_CIRCLE_CLASSES[tone],
				className,
			)}
			aria-hidden="true"
		>
			<Icon className="size-7" aria-hidden="true" />
		</div>
	);
}

function ResponsiveAlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogHeader");
	return isMobile ? (
		<DrawerHeader className={cn("items-center text-center", className)} {...props} />
	) : (
		<AlertDialogHeader className={className} {...props} />
	);
}

function ResponsiveAlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogTitle");
	return isMobile ? (
		<DrawerTitle
			className={cn("text-foreground text-center text-xl font-semibold tracking-tight", className)}
			{...props}
		/>
	) : (
		<AlertDialogTitle className={className} {...props} />
	);
}

function ResponsiveAlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogDescription");
	return isMobile ? (
		<DrawerDescription
			className={cn("text-muted-foreground text-center text-[15px] text-balance", className)}
			{...props}
		/>
	) : (
		<AlertDialogDescription className={className} {...props} />
	);
}

function ResponsiveAlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogFooter");
	if (isMobile) {
		return (
			<DrawerFooter
				className={cn(
					// Action en haut, Cancel en bas (HIG mobile : action principale au-dessus du fold tactile).
					// Le DOM ordre reste Cancel→Action ; flex-col-reverse fait l'inversion visuelle.
					"flex-col-reverse gap-2 pt-3 pb-1",
					className,
				)}
				{...props}
			/>
		);
	}
	return <AlertDialogFooter className={className} {...props} />;
}

type CancelProps = React.ComponentProps<typeof AlertDialogCancel>;

function ResponsiveAlertDialogCancel({
	className,
	disabled,
	children,
	onClick,
	...props
}: CancelProps) {
	const { isMobile } = useResponsiveAlert("ResponsiveAlertDialogCancel");
	if (isMobile) {
		return (
			<DrawerClose asChild>
				<Button
					type="button"
					variant="ghost"
					disabled={disabled}
					className={cn(
						"h-12 w-full rounded-xl text-base font-medium active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
						className,
					)}
					onClick={onClick}
				>
					{children}
				</Button>
			</DrawerClose>
		);
	}
	return (
		<AlertDialogCancel className={className} disabled={disabled} onClick={onClick} {...props}>
			{children}
		</AlertDialogCancel>
	);
}

type ActionProps = React.ComponentProps<typeof AlertDialogAction>;

function ResponsiveAlertDialogAction({
	className,
	disabled,
	children,
	onClick,
	type = "button",
	...props
}: ActionProps) {
	const { isMobile, tone } = useResponsiveAlert("ResponsiveAlertDialogAction");
	const haptic = TONE_HAPTIC[tone];
	if (isMobile) {
		return (
			<Button
				type={type}
				disabled={disabled}
				className={cn(
					buttonVariants(),
					"h-12 w-full rounded-xl text-base font-medium active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-150",
					TONE_ACTION_CLASSES[tone],
					className,
				)}
				onClick={(event) => {
					triggerHaptic(haptic);
					onClick?.(event);
				}}
			>
				{children}
			</Button>
		);
	}
	return (
		<AlertDialogAction
			className={cn(TONE_ACTION_CLASSES[tone], className)}
			disabled={disabled}
			type={type}
			onClick={(event) => {
				triggerHaptic(haptic);
				onClick?.(event);
			}}
			{...props}
		>
			{children}
		</AlertDialogAction>
	);
}

export {
	ResponsiveAlertDialog,
	ResponsiveAlertDialogAction,
	ResponsiveAlertDialogCancel,
	ResponsiveAlertDialogContent,
	ResponsiveAlertDialogDescription,
	ResponsiveAlertDialogFooter,
	ResponsiveAlertDialogHeader,
	ResponsiveAlertDialogHeroIcon,
	ResponsiveAlertDialogTitle,
	ResponsiveAlertDialogTrigger,
};
