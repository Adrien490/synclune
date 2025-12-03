"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Progress } from "@/shared/components/ui/progress";
import type { WizardStep } from "./use-form-wizard";

interface WizardProgressProps {
	steps: WizardStep[];
	currentStep: number;
	completedSteps: Set<number>;
	onStepClick?: (step: number) => void;
	variant?: "dots" | "stepper" | "progress-bar";
	className?: string;
}

export function WizardProgress({
	steps,
	currentStep,
	completedSteps,
	onStepClick,
	variant = "progress-bar",
	className,
}: WizardProgressProps) {
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
			<div className={cn("flex items-center justify-center gap-2", className)}>
				{steps.map((step, index) => (
					<button
						key={step.id}
						type="button"
						onClick={() => onStepClick?.(index)}
						disabled={index > currentStep && !completedSteps.has(index)}
						className={cn(
							"size-2.5 rounded-full transition-all",
							index === currentStep
								? "bg-primary w-6"
								: completedSteps.has(index)
									? "bg-primary/60 hover:bg-primary/80"
									: "bg-muted-foreground/30",
							index > currentStep &&
								!completedSteps.has(index) &&
								"cursor-not-allowed"
						)}
						aria-label={`Étape ${index + 1}: ${step.label}`}
						aria-current={index === currentStep ? "step" : undefined}
					/>
				))}
			</div>
		);
	}

	// Default: stepper variant (horizontal steps with labels)
	return (
		<nav aria-label="Progression du formulaire" className={className}>
			<ol className="flex items-center gap-2">
				{steps.map((step, index) => {
					const isCompleted = completedSteps.has(index);
					const isCurrent = index === currentStep;
					const canNavigate = index <= currentStep || isCompleted;

					return (
						<li key={step.id} className="flex items-center gap-2 flex-1">
							<button
								type="button"
								onClick={() => canNavigate && onStepClick?.(index)}
								disabled={!canNavigate}
								className={cn(
									"flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm font-medium",
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
								aria-current={isCurrent ? "step" : undefined}
							>
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
					);
				})}
			</ol>
		</nav>
	);
}
