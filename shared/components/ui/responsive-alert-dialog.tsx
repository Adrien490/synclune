"use client";

import * as React from "react";
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
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";

export type ResponsiveAlertTone = "destructive" | "warning" | "info" | "success" | "neutral";

type ResponsiveCtx = {
	tone: ResponsiveAlertTone;
};

const Ctx = React.createContext<ResponsiveCtx | null>(null);

function useResponsiveAlert(component: string): ResponsiveCtx {
	const ctx = React.use(Ctx);
	if (!ctx) {
		throw new Error(
			`${component} must be used inside <ResponsiveAlertDialog>. ` +
				`Wrap your tree with <ResponsiveAlertDialog open onOpenChange>.`,
		);
	}
	return ctx;
}

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
	 * Tonalité visuelle de l'alerte. Pilote la couleur de l'action button
	 * et le pattern haptic (heavy pour destructive, success pour validation, etc.).
	 * @default "neutral"
	 */
	tone?: ResponsiveAlertTone;
};

/**
 * AlertDialog uniforme (Radix) : rendu identique mobile et desktop.
 * La tonalité (`tone`) pilote la couleur du bouton d'action et le pattern haptic
 * déclenché au tap.
 */
function ResponsiveAlertDialog({ open, onOpenChange, children, tone = "neutral" }: RootProps) {
	const value = React.useMemo(() => ({ tone }), [tone]);

	return (
		<Ctx.Provider value={value}>
			<AlertDialog open={open} onOpenChange={onOpenChange}>
				{children}
			</AlertDialog>
		</Ctx.Provider>
	);
}

function ResponsiveAlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogTrigger>) {
	useResponsiveAlert("ResponsiveAlertDialogTrigger");
	return <AlertDialogTrigger {...props} />;
}

function ResponsiveAlertDialogContent({
	className,
	children,
	...props
}: React.ComponentProps<typeof AlertDialogContent>) {
	useResponsiveAlert("ResponsiveAlertDialogContent");
	return (
		<AlertDialogContent className={className} {...props}>
			{children}
		</AlertDialogContent>
	);
}

/**
 * No-op : conservé pour compatibilité avec les callsites existants.
 * Le hero icon n'est plus rendu (uniformisation AlertDialog Radix).
 */
function ResponsiveAlertDialogHeroIcon(_: {
	icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
	className?: string;
}) {
	return null;
}

function ResponsiveAlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	useResponsiveAlert("ResponsiveAlertDialogHeader");
	return <AlertDialogHeader className={className} {...props} />;
}

function ResponsiveAlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogTitle>) {
	useResponsiveAlert("ResponsiveAlertDialogTitle");
	return <AlertDialogTitle className={className} {...props} />;
}

function ResponsiveAlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof AlertDialogDescription>) {
	useResponsiveAlert("ResponsiveAlertDialogDescription");
	return <AlertDialogDescription className={className} {...props} />;
}

function ResponsiveAlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
	useResponsiveAlert("ResponsiveAlertDialogFooter");
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
	useResponsiveAlert("ResponsiveAlertDialogCancel");
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
	const { tone } = useResponsiveAlert("ResponsiveAlertDialogAction");
	const haptic = TONE_HAPTIC[tone];
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
