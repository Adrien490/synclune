"use client"

import { memo, useCallback, type KeyboardEvent } from "react"
import { Check } from "lucide-react"
import { cn } from "@/shared/utils/cn"
import { Progress } from "@/shared/components/ui/progress"
import type { WizardStep, WizardProgressVariant } from "../types"

interface WizardProgressProps {
	steps: WizardStep[]
	currentStep: number
	completedSteps: Set<number>
	onStepClick?: (step: number) => void
	variant?: WizardProgressVariant
	className?: string
	/** Function to get errors for a step (for visual error indicator) */
	getStepErrors?: (stepIndex: number) => string[]
	/** Enable keyboard navigation (← →) */
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
	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLDivElement>) => {
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
		},
		[enableKeyboardNav, onStepClick, currentStep, steps.length, completedSteps]
	)

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
				<Progress value={progress} className="h-2" />
			</div>
		);
	}

	if (variant === "dots") {
		return (
			<div
				role="tablist"
				aria-label="Navigation entre les étapes"
				onKeyDown={handleKeyDown}
				tabIndex={0}
				className={cn("flex items-center gap-3 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full", className)}
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
								"relative size-3 rounded-full transition-all",
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
							tabIndex={-1}
						>
							{/* Error indicator */}
							{hasErrors && !isActive && (
								<span className="absolute -top-0.5 -right-0.5 size-2 bg-destructive rounded-full animate-pulse" />
							)}
						</button>
					)
				})}
			</div>
		)
	}

	// Default: stepper variant (horizontal steps with labels)
	return (
		<nav
			aria-label="Progression du formulaire"
			onKeyDown={handleKeyDown}
			tabIndex={0}
			className={cn("focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg", className)}
		>
			<ol role="tablist" className="flex items-center gap-2">
				{steps.map((step, index) => {
					const isCompleted = completedSteps.has(index)
					const isCurrent = index === currentStep
					const canNavigate = index <= currentStep || isCompleted
					const hasErrors = hasStepErrors(index)

					return (
						<li key={step.id} className="flex items-center gap-2 flex-1">
							<button
								type="button"
								role="tab"
								onClick={() => canNavigate && onStepClick?.(index)}
								disabled={!canNavigate}
								className={cn(
									"relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isCurrent && "bg-primary text-primary-foreground",
									isCompleted &&
										!isCurrent &&
										"bg-primary/10 text-primary hover:bg-primary/20",
									!isCurrent &&
										!isCompleted &&
										"text-muted-foreground hover:bg-muted/50",
									!canNavigate && "opacity-50 cursor-not-allowed"
								)}
								aria-selected={isCurrent}
								aria-current={isCurrent ? "step" : undefined}
								aria-label={`${step.label}${hasErrors ? " (contient des erreurs)" : ""}`}
								tabIndex={-1}
							>
								{/* Error indicator */}
								{hasErrors && !isCurrent && (
									<span className="absolute -top-1 -right-1 size-2 bg-destructive rounded-full animate-pulse" />
								)}
								<span
									className={cn(
										"flex items-center justify-center size-6 rounded-full text-xs font-bold shrink-0",
										isCurrent && "bg-primary-foreground/20",
										isCompleted &&
											!isCurrent &&
											"bg-primary text-primary-foreground"
									)}
								>
									{isCompleted && !isCurrent ? (
										<Check className="size-3.5" />
									) : step.icon ? (
										step.icon
									) : (
										index + 1
									)}
								</span>
								<span className="hidden sm:inline truncate">{step.label}</span>
							</button>

							{index < steps.length - 1 && (
								<div
									className={cn(
										"flex-1 h-px min-w-4",
										index < currentStep || isCompleted
											? "bg-primary"
											: "bg-border"
									)}
								/>
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
})
