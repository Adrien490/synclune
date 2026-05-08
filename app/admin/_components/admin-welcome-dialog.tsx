"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { m, useReducedMotion } from "motion/react";

import { markWelcomeShown } from "@/modules/auth/actions/mark-welcome-shown";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHandle,
	SheetTitle,
} from "@/shared/components/ui/sheet";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { ActionStatus } from "@/shared/types/server-action";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface AdminWelcomeDialogProps {
	userName: string | null;
}

// Délai avant qu'Esc / clic-extérieur / drag-down puissent fermer.
// 2s = compromis : laisse l'animation d'ouverture (~600ms) respirer + audible
// pour les screen-readers, sans bloquer un utilisateur pressé trop longtemps.
const DISMISS_DELAY_MS = 2000;

export function AdminWelcomeDialog({ userName }: AdminWelcomeDialogProps) {
	const [open, setOpen] = useState(true);
	const [canDismiss, setCanDismiss] = useState(false);
	const [isPending, startTransition] = useTransition();
	const haptic = useHaptic();
	const shouldReduceMotion = useReducedMotion();
	const isMobile = useIsMobile();

	const previousFocusRef = useRef<HTMLElement | null>(null);

	const onMount = useEffectEvent(() => {
		previousFocusRef.current = document.activeElement as HTMLElement | null;
		haptic("success");
	});

	useEffect(() => {
		onMount();
		const t = setTimeout(() => setCanDismiss(true), DISMISS_DELAY_MS);
		return () => clearTimeout(t);
	}, []);

	const closeDialog = () => {
		withViewTransition(() => setOpen(false));
		requestAnimationFrame(() => {
			previousFocusRef.current?.focus({ preventScroll: true });
		});
	};

	const handleClose = () => {
		haptic("medium");
		startTransition(async () => {
			const result = await markWelcomeShown();
			if (result.status === ActionStatus.SUCCESS) {
				closeDialog();
				haptic("success");
				toast.success("Bisous bisous", { duration: 3500 });
			} else {
				haptic("error");
				toast.error(result.message);
			}
		});
	};

	const firstName = userName?.split(" ")[0] ?? null;
	const titleNode = (
		<>
			{firstName ?? "Bienvenue"}
			<span aria-hidden="true"> 💛</span>
		</>
	);

	const TitleSlot = isMobile ? SheetTitle : ResponsiveDialogTitle;

	const body = (
		<>
			<span role="status" aria-live="polite" className="sr-only">
				{!canDismiss ? "Lecture en cours, fermeture disponible dans un instant" : ""}
			</span>

			<m.div
				initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
				className="flex flex-col items-center gap-6 px-2 py-4 text-center sm:px-4"
			>
				<m.div
					initial={shouldReduceMotion ? false : { scale: 0, rotate: -20 }}
					animate={{ scale: 1, rotate: 0 }}
					transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 14 }}
					className="bg-primary/10 text-primary rounded-full p-4"
					aria-hidden="true"
				>
					<Heart className="h-8 w-8 fill-current" />
				</m.div>

				<div className="space-y-3">
					<TitleSlot asChild>
						<h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
							{/* TODO Adrien : titre à personnaliser */}
							{titleNode}
						</h2>
					</TitleSlot>

					{/* TODO Adrien : remplis ce bloc avec tes mots à toi.
					    Garde la structure <p> pour le rythme de lecture.
					    Supprime ce commentaire avant le commit. */}
					<div className="text-foreground/85 space-y-3 text-base leading-relaxed text-pretty">
						<p>[Premier paragraphe — pose le moment]</p>
						<p>[Deuxième paragraphe — dis-lui ce que tu ressens]</p>
						<p className="text-foreground font-medium">[Phrase finale, plus forte]</p>
						<p className="text-foreground">— Adri</p>
					</div>
				</div>

				<Button
					onClick={handleClose}
					disabled={isPending}
					aria-busy={isPending}
					size="lg"
					className="min-w-48"
				>
					{isPending ? (
						<>
							<LoaderCircle className="h-4 w-4 animate-spin" />
							Un instant&nbsp;…
						</>
					) : (
						"Merci Adri"
					)}
				</Button>
			</m.div>
		</>
	);

	if (isMobile) {
		return (
			<Sheet
				open={open}
				direction="bottom"
				dismissible={canDismiss && !isPending}
				onOpenChange={(next) => {
					if (!next && !isPending && canDismiss) handleClose();
				}}
			>
				<SheetContent
					showCloseButton={false}
					className="rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6"
				>
					<SheetHandle />
					<SheetDescription className="sr-only">
						Message personnel pour ta première connexion
					</SheetDescription>
					{body}
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={(next) => {
				if (!next && !isPending && canDismiss) handleClose();
			}}
		>
			<ResponsiveDialogContent
				className="pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:max-w-lg"
				onPointerDownOutside={(e) => {
					if (!canDismiss) e.preventDefault();
				}}
				onEscapeKeyDown={(e) => {
					if (!canDismiss) e.preventDefault();
				}}
			>
				<ResponsiveDialogDescription className="sr-only">
					Message personnel pour ta première connexion
				</ResponsiveDialogDescription>
				{body}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
