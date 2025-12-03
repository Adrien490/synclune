"use client"

import { memo, useCallback } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/shared/utils/cn"
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config"
import { useWizardContext } from "./wizard-context"
import type { WizardStep } from "../types"

interface WizardStepContainerProps {
	step: WizardStep
	stepIndex: number
	children: React.ReactNode
	className?: string
	/** Callback pour enregistrer la ref de l'étape (pour l'accessibilité) */
	onRegisterRef?: (stepIndex: number, element: HTMLElement | null) => void
}

export const WizardStepContainer = memo(function WizardStepContainer({
	step,
	stepIndex,
	children,
	className,
	onRegisterRef,
}: WizardStepContainerProps) {
	const { currentStep, isMobile, desktopMode } = useWizardContext()
	const shouldReduceMotion = useReducedMotion()

	const isActive = currentStep === stepIndex
	const effectiveMode = isMobile ? "wizard" : desktopMode

	// Callback pour enregistrer la ref
	const refCallback = useCallback(
		(element: HTMLDivElement | null) => {
			onRegisterRef?.(stepIndex, element)
		},
		[onRegisterRef, stepIndex]
	)

	// In "all" mode on desktop, always show all steps
	if (effectiveMode === "all") {
		return (
			<div ref={refCallback} className={className} data-step={step.id}>
				{children}
			</div>
		)
	}

	// In wizard mode, ALWAYS keep content in DOM for form state preservation
	// Hidden steps remain in DOM so inputs preserve their values for FormData
	// This is crucial for multi-step forms to work correctly

	// Inactive steps: hidden but in DOM
	// Using inert instead of aria-hidden to preserve form data while making content inaccessible
	if (!isActive) {
		return (
			<div
				ref={refCallback}
				className="hidden"
				data-step={step.id}
				inert={true}
			>
				{children}
			</div>
		)
	}

	// Active step: visible with entrance animation
	return (
		<motion.div
			ref={refCallback}
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
	)
})
