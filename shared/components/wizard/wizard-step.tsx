"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { useWizardContext } from "./wizard-context";
import type { WizardStep } from "./use-form-wizard";

interface WizardStepContainerProps {
	step: WizardStep;
	stepIndex: number;
	children: React.ReactNode;
	className?: string;
}

export function WizardStepContainer({
	step,
	stepIndex,
	children,
	className,
}: WizardStepContainerProps) {
	const { currentStep, isMobile, desktopMode } = useWizardContext();
	const shouldReduceMotion = useReducedMotion();

	const isActive = currentStep === stepIndex;
	const effectiveMode = isMobile ? "wizard" : desktopMode;

	// In "all" mode on desktop, always show all steps
	if (effectiveMode === "all") {
		return (
			<div className={className} data-step={step.id}>
				{children}
			</div>
		);
	}

	// In wizard mode, ALWAYS keep content in DOM for form state preservation
	// Hidden steps remain in DOM so inputs preserve their values for FormData
	// This is crucial for multi-step forms to work correctly

	// Inactive steps: hidden but in DOM
	if (!isActive) {
		return (
			<div className="hidden" data-step={step.id} aria-hidden="true">
				{children}
			</div>
		);
	}

	// Active step: visible with entrance animation
	return (
		<motion.div
			key={step.id}
			initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: {
							duration: MOTION_CONFIG.duration.fast,
							ease: MOTION_CONFIG.easing.easeOut,
						}
			}
			className={cn("w-full", className)}
			data-step={step.id}
		>
			{children}
		</motion.div>
	);
}
