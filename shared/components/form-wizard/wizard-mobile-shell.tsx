"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { WizardProgress } from "./wizard-progress";
import { WizardNavigation } from "./wizard-navigation";
import type { WizardStep } from "@/shared/types/form-wizard";

/** Distance maximale de translation pendant le swipe (en pixels) */
const MAX_SWIPE_OFFSET = 80;
/** Seuil minimal pour afficher les indicateurs de direction */
const DIRECTION_INDICATOR_THRESHOLD = 20;

interface WizardMobileShellProps {
	steps: WizardStep[];
	currentStep: number;
	completedSteps: Set<number>;
	onStepClick: (step: number) => Promise<boolean>;
	isFirstStep: boolean;
	isLastStep: boolean;
	onPrevious: () => void;
	onNext: () => Promise<boolean>;
	isSubmitting?: boolean;
	isValidating?: boolean;
	/** Bloque la navigation (ex: upload en cours, génération miniatures) */
	isBlocked?: boolean;
	/** Message affiché quand isBlocked est true */
	blockedMessage?: string;
	title?: string;
	children: React.ReactNode;
	className?: string;
	/** Function to get errors for a step (for visual indicator) */
	getStepErrors?: (stepIndex: number) => string[];
	/** Custom footer for the last step (replaces default submit button) */
	renderLastStepFooter?: () => React.ReactNode;
}

export function WizardMobileShell({
	steps,
	currentStep,
	completedSteps,
	onStepClick,
	isFirstStep,
	isLastStep,
	onPrevious,
	onNext,
	isSubmitting,
	isValidating,
	isBlocked,
	blockedMessage,
	title,
	children,
	className,
	getStepErrors,
	renderLastStepFooter,
}: WizardMobileShellProps) {
	// Live region for screen reader announcements
	const [announcement, setAnnouncement] = useState("");
	const previousStepRef = useRef(currentStep);

	// Swipe feedback visuel
	const [swipeOffset, setSwipeOffset] = useState(0);
	const isSwipingRef = useRef(false);

	useEffect(() => {
		if (previousStepRef.current !== currentStep) {
			previousStepRef.current = currentStep;
			const stepLabel = steps[currentStep]?.label || "";
			setAnnouncement(`Étape ${currentStep + 1} sur ${steps.length}: ${stepLabel}`);
		}
	}, [currentStep, steps]);

	// Vérifie si la navigation est bloquée
	const isNavigationBlocked = isSubmitting || isValidating || isBlocked;

	// Haptic feedback (vibration courte)
	const triggerHaptic = () => {
		if ("vibrate" in navigator) {
			navigator.vibrate(10);
		}
	};

	// Swipe handlers for mobile navigation with visual feedback
	const swipeHandlers = useSwipeable({
		onSwiping: (e) => {
			// Ne pas appliquer de feedback si navigation bloquée
			if (isNavigationBlocked) return;

			// Limiter le feedback visuel
			const offset = Math.max(-MAX_SWIPE_OFFSET, Math.min(MAX_SWIPE_OFFSET, e.deltaX));

			// Bloquer le swipe vers la gauche si dernière étape
			if (isLastStep && offset < 0) {
				setSwipeOffset(0);
				return;
			}

			// Bloquer le swipe vers la droite si première étape
			if (isFirstStep && offset > 0) {
				setSwipeOffset(0);
				return;
			}

			isSwipingRef.current = true;
			setSwipeOffset(offset);
		},
		onSwipedLeft: () => {
			setSwipeOffset(0);
			isSwipingRef.current = false;

			// Swipe left = go to next step (with validation)
			if (!isLastStep && !isNavigationBlocked) {
				triggerHaptic();
				onNext().catch(() => {
					// Validation failed - handled by wizard validation system
				});
			}
		},
		onSwipedRight: () => {
			setSwipeOffset(0);
			isSwipingRef.current = false;

			// Swipe right = go to previous step (no validation)
			if (!isFirstStep && !isNavigationBlocked) {
				triggerHaptic();
				onPrevious();
			}
		},
		onTouchEndOrOnMouseUp: () => {
			// Reset si le swipe est annulé (pas assez de distance)
			setSwipeOffset(0);
			isSwipingRef.current = false;
		},
		preventScrollOnSwipe: false,
		trackMouse: false, // Only touch devices
		delta: 50, // Minimum swipe distance
		swipeDuration: 500, // Maximum swipe duration
	});

	// Indicateurs de direction
	const showNextIndicator = swipeOffset < -DIRECTION_INDICATOR_THRESHOLD && !isLastStep;
	const showPrevIndicator = swipeOffset > DIRECTION_INDICATOR_THRESHOLD && !isFirstStep;

	const wizardTitleId = title ? "wizard-mobile-title" : undefined

	return (
		<div
			className={cn("flex flex-col min-h-0", className)}
			role="region"
			aria-labelledby={wizardTitleId}
		>
			{/* Live region for screen reader announcements */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{announcement}
			</div>

			{/* Progress bar at top - using dots variant for compact mobile display */}
			<div className="-mx-4 px-4 py-3 border-b bg-background">
				{title && (
					<h2 id={wizardTitleId} className="text-lg font-semibold font-display mb-3">{title}</h2>
				)}
				<div className="flex items-center justify-between gap-4">
					<WizardProgress
						steps={steps}
						currentStep={currentStep}
						completedSteps={completedSteps}
						onStepClick={onStepClick}
						variant="dots"
						getStepErrors={getStepErrors}
					/>
					{/* Current step label */}
					<p className="text-sm text-muted-foreground whitespace-nowrap">
						{steps[currentStep]?.label}
					</p>
				</div>
			</div>

			{/* Content with swipe gesture support and visual feedback */}
			<div
				{...swipeHandlers}
				className="relative py-4 touch-pan-y overflow-hidden"
			>
				{/* Container avec translation pendant le swipe */}
				<div
					style={{
						transform: `translateX(${swipeOffset}px)`,
						transition: isSwipingRef.current ? "none" : "transform 0.2s ease-out",
					}}
				>
					{children}
				</div>

				{/* Indicateur swipe vers la droite (previous) */}
				{showPrevIndicator && (
					<div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" aria-hidden="true">
						<ChevronLeft className="size-8 animate-pulse" />
					</div>
				)}

				{/* Indicateur swipe vers la gauche (next) */}
				{showNextIndicator && (
					<div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" aria-hidden="true">
						<ChevronRight className="size-8 animate-pulse" />
					</div>
				)}
			</div>

			{/* Footer with navigation */}
			<div className="-mx-4 px-4 py-3 border-t bg-background mt-auto">
				{isLastStep && renderLastStepFooter ? (
					renderLastStepFooter()
				) : (
					<WizardNavigation
						isFirstStep={isFirstStep}
						isLastStep={isLastStep}
						onPrevious={onPrevious}
						onNext={onNext}
						isSubmitting={isSubmitting}
						isValidating={isValidating}
						isBlocked={isBlocked}
						blockedMessage={blockedMessage}
					/>
				)}
			</div>
		</div>
	);
}
