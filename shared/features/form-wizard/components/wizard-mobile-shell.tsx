"use client";

import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { cn } from "@/shared/utils/cn";
import { WizardProgress } from "./wizard-progress";
import { WizardNavigation } from "./wizard-navigation";
import type { WizardStep } from "../types";

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
	title?: string;
	children: React.ReactNode;
	className?: string;
	/** Function to get errors for a step (for visual indicator) */
	getStepErrors?: (stepIndex: number) => string[];
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
	title,
	children,
	className,
	getStepErrors,
}: WizardMobileShellProps) {
	// Live region for screen reader announcements
	const [announcement, setAnnouncement] = useState("");
	const previousStepRef = useRef(currentStep);

	useEffect(() => {
		if (previousStepRef.current !== currentStep) {
			previousStepRef.current = currentStep;
			const stepLabel = steps[currentStep]?.label || "";
			setAnnouncement(`Étape ${currentStep + 1} sur ${steps.length}: ${stepLabel}`);
		}
	}, [currentStep, steps]);

	// Swipe handlers for mobile navigation
	const swipeHandlers = useSwipeable({
		onSwipedLeft: () => {
			// Swipe left = go to next step (with validation)
			if (!isLastStep && !isSubmitting && !isValidating) {
				void onNext();
			}
		},
		onSwipedRight: () => {
			// Swipe right = go to previous step (no validation)
			if (!isFirstStep && !isSubmitting && !isValidating) {
				onPrevious();
			}
		},
		preventScrollOnSwipe: false,
		trackMouse: false, // Only touch devices
		delta: 50, // Minimum swipe distance
		swipeDuration: 500, // Maximum swipe duration
	});

	return (
		<div className={cn("flex flex-col min-h-0", className)}>
			{/* Live region for screen reader announcements */}
			<div
				role="status"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			>
				{announcement}
			</div>

			{/* Sticky progress bar at top - using dots variant for compact mobile display */}
			<div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
				{title && (
					<h2 className="text-lg font-semibold font-display mb-3">{title}</h2>
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

			{/* Content flows normally - with swipe gesture support */}
			<div {...swipeHandlers} className="py-4 touch-pan-y">
				{children}
			</div>

			{/* Sticky footer with navigation - positioned above bottom-nav (h-16 = 64px) */}
			<div className="sticky bottom-16 z-10 -mx-4 px-4 py-3 border-t bg-background/95 backdrop-blur-sm mt-auto">
				<WizardNavigation
					isFirstStep={isFirstStep}
					isLastStep={isLastStep}
					onPrevious={onPrevious}
					onNext={onNext}
					isSubmitting={isSubmitting}
					isValidating={isValidating}
				/>
			</div>
		</div>
	);
}
