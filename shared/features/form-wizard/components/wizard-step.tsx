"use client"

import { memo } from "react"
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

/**
 * Container pour une étape du wizard (mobile-only).
 * Garde toujours le contenu dans le DOM pour préserver l'état du formulaire.
 */
export const WizardStepContainer = memo(function WizardStepContainer({
	step,
	stepIndex,
	children,
	className,
	onRegisterRef,
}: WizardStepContainerProps) {
	const { currentStep } = useWizardContext()
	const shouldReduceMotion = useReducedMotion()

	const isActive = currentStep === stepIndex

	// Callback pour enregistrer la ref
	const refCallback = (element: HTMLDivElement | null) => {
		onRegisterRef?.(stepIndex, element)
	}

	// Étape inactive : cachée mais dans le DOM pour préserver les valeurs FormData
	// Utilise inert pour rendre le contenu inaccessible tout en préservant les données
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

	// Étape active : visible avec animation d'entrée
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
