"use client";

import {
	useEffect,
	useEffectEvent,
	useRef,
	useState,
	useTransition,
	type CSSProperties,
} from "react";
import { LoaderCircle } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import Image from "next/image";

import { markWelcomeShown } from "@/modules/auth/actions/mark-welcome-shown";
import { Stagger } from "@/shared/components/animations/stagger";
import { PolaroidFrame } from "@/shared/components/polaroid-frame";
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

// Délai avant qu'Esc / clic-extérieur / drag-down puissent fermer.
// 2s = compromis : laisse l'animation d'ouverture (~600ms) respirer + audible
// pour les screen-readers, sans bloquer un utilisateur pressé trop longtemps.
const DISMISS_DELAY_MS = 2000;

export function AdminWelcomeDialog() {
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
			} else {
				haptic("error");
				toast.error(result.message);
			}
		});
	};

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
					initial={shouldReduceMotion ? false : { scale: 0, rotate: -8 }}
					animate={{ scale: 1, rotate: 0 }}
					transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 14 }}
				>
					<PolaroidFrame
						tiltDegree={-3}
						washiTape
						washiColor="peach"
						washiPosition="top-left"
						vintage
						className="w-44 hover:shadow-[0_0_25px_var(--color-glow-yellow),0_12px_24px_-8px_rgba(0,0,0,0.15)] sm:w-52"
					>
						<Image
							src="/adri-lele.jpg"
							alt="Adri et Lélé"
							fill
							sizes="(max-width: 640px) 160px, 192px"
							className="object-cover object-[center_30%]"
							priority
						/>
					</PolaroidFrame>
				</m.div>

				<div className="space-y-3">
					<TitleSlot asChild>
						<h2 className="text-shadow-glow text-2xl font-semibold tracking-tight sm:text-3xl">
							Coucou Lélé&nbsp;!
						</h2>
					</TitleSlot>

					<Stagger
						stagger={0.18}
						y={12}
						delay={0.6}
						className="text-foreground/85 space-y-3 text-base leading-relaxed text-pretty"
					>
						<p>Voilà la première version du site.</p>
						<p className="text-foreground font-medium">
							Au nom de notre amitié<span aria-hidden="true"> 💛</span>
						</p>
						<div className="flex flex-col items-center gap-1 pt-1">
							<svg
								viewBox="0 0 30 4"
								aria-hidden="true"
								className="text-foreground/40 h-[0.4em] w-12"
							>
								<line
									x1="0"
									y1="2"
									x2="30"
									y2="2"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									className="doodle-draw"
									style={{ "--path-length": "30", "--draw-delay": "1.2s" } as CSSProperties}
								/>
							</svg>
							<p className="font-cursive text-foreground text-shadow-glow text-3xl sm:text-4xl">
								Adri
							</p>
						</div>
					</Stagger>
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
							<LoaderCircle className="size-4 animate-spin" />
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
					registerOverlay={false}
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
