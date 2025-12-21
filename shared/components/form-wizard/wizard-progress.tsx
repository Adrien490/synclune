"use client"

import { memo, type KeyboardEvent } from "react"
import { cn } from "@/shared/utils/cn"
import { Progress } from "@/shared/components/ui/progress"
import type { WizardStep, WizardProgressVariant } from "@/shared/types/form-wizard"

interface WizardProgressProps {
	steps: WizardStep[]
	currentStep: number
	completedSteps: Set<number>
	onStepClick?: (step: number) => void
	/** Variante d'affichage : "progress-bar" (défaut) ou "dots" */
	variant?: WizardProgressVariant
	className?: string
	/** Fonction pour récupérer les erreurs d'une étape (indicateur visuel) */
	getStepErrors?: (stepIndex: number) => string[]
	/** Active la navigation clavier (← →) */
	enableKeyboardNav?: boolean
}

export const WizardProgress = memo(function WizardProgress({
	steps,
	currentStep,
	completedSteps,
	onStepClick,
	variant = "progress-bar",
	className,
	getStepErrors,
	enableKeyboardNav = true,
}: WizardProgressProps) {
	// Helper to check if step has errors
	const hasStepErrors = (stepIndex: number): boolean => {
		if (!getStepErrors) return false
		return getStepErrors(stepIndex).length > 0
	}

	// Keyboard navigation handler
	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!enableKeyboardNav || !onStepClick) return

		if (e.key === "ArrowLeft" && currentStep > 0) {
			e.preventDefault()
			onStepClick(currentStep - 1)
		} else if (e.key === "ArrowRight" && currentStep < steps.length - 1) {
			e.preventDefault()
			const nextStep = currentStep + 1
			// Permettre d'avancer si l'étape actuelle est complétée ou si l'étape cible est déjà visitée
			const canNavigate = completedSteps.has(currentStep) || completedSteps.has(nextStep)
			if (canNavigate) {
				onStepClick(nextStep)
			}
		}
	}

	if (variant === "progress-bar") {
		const progress = ((currentStep + 1) / steps.length) * 100;
		return (
			<div className={cn("space-y-2", className)}>
				<div className="flex justify-between text-sm text-muted-foreground">
					<span>
						Étape {currentStep + 1} sur {steps.length}
					</span>
					<span className="font-medium text-foreground">
						{steps[currentStep]?.label}
					</span>
				</div>
				<Progress
					value={progress}
					className="h-2"
					aria-label={`Progression: étape ${currentStep + 1} sur ${steps.length}`}
				/>
			</div>
		);
	}

	// Variante dots : points cliquables compacts (recommandé pour mobile)
	// Roving tabindex: seul le dot actif est tabbable, navigation par flèches
	return (
		<div
			role="tablist"
			aria-label="Navigation entre les étapes"
			onKeyDown={handleKeyDown}
			className={cn("flex items-center gap-3", className)}
		>
			{steps.map((step, index) => {
				const isActive = index === currentStep
				const isCompleted = completedSteps.has(index)
				const hasErrors = hasStepErrors(index)
				const canNavigate = index <= currentStep || isCompleted

				return (
					<button
						key={step.id}
						type="button"
						role="tab"
						onClick={() => canNavigate && onStepClick?.(index)}
						disabled={!canNavigate}
						className={cn(
							// Zone tactile 44px (p-4 = 16px * 2 + 12px = 44px)
							"relative size-3 rounded-full transition-all p-4 -m-4 bg-clip-content",
							isActive
								? "bg-primary scale-125"
								: isCompleted
									? "bg-primary/60 hover:bg-primary/80"
									: "bg-muted-foreground/30",
							!canNavigate && "cursor-not-allowed opacity-50"
						)}
						aria-label={`Étape ${index + 1}: ${step.label}${hasErrors ? " (contient des erreurs)" : ""}`}
						aria-selected={isActive}
						aria-current={isActive ? "step" : undefined}
						tabIndex={isActive ? 0 : -1}
					>
						{/* Indicateur d'erreur */}
						{hasErrors && !isActive && (
							<span className="absolute -top-0.5 -right-0.5 size-2 bg-destructive rounded-full animate-pulse" />
						)}
					</button>
				)
			})}
		</div>
	)
})
