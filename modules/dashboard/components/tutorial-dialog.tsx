"use client";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/utils/cn";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { TUTORIAL_STEPS } from "../constants/tutorial-steps";
import { useTutorialDialog } from "../hooks/use-tutorial-dialog";

interface TutorialDialogProps {
	/**
	 * Ouvre le dialog automatiquement (pour trigger programmatique)
	 */
	autoOpen?: boolean;
}

export function TutorialDialog({ autoOpen = false }: TutorialDialogProps = {}) {
	const {
		currentStep,
		isOpen,
		dontShowAgain,
		step,
		isLastStep,
		isFirstStep,
		totalSteps,
		progress,
		setIsOpen,
		setDontShowAgain,
		goToStep,
		handleNext,
		handlePrevious,
		handleReset,
		handleClose,
	} = useTutorialDialog({ autoOpen });

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					onClick={handleReset}
					className="w-full justify-start gap-2"
				>
					<Sparkles className="h-4 w-4" />
					<span>Aide - Tutoriel</span>
				</Button>
			</DialogTrigger>

			<DialogContent
				className="sm:max-w-[600px] h-[80vh] flex flex-col"
				onEscapeKeyDown={handleClose}
				onPointerDownOutside={handleClose}
			>
				<div className="shrink-0">
					<DialogHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								{step.icon}
								<div>
									<DialogTitle className="text-xl">{step.title}</DialogTitle>
									<Badge variant="secondary" className="mt-1">
										Étape {currentStep + 1} / {totalSteps}
									</Badge>
								</div>
							</div>
						</div>
						<DialogDescription className="text-base pt-4">
							{step.description}
						</DialogDescription>
					</DialogHeader>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-4">
					{step.tips && (
						<div className="space-y-3">
							{step.tips.map((tip, index) => (
								<div
									key={index}
									className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
								>
									<div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
										{index + 1}
									</div>
									<p className="text-sm leading-relaxed">{tip}</p>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="shrink-0 border-t px-6 py-4 space-y-4">
					{/* Checkbox "Ne plus afficher" */}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="dont-show-again"
							checked={dontShowAgain}
							onCheckedChange={(checked) => setDontShowAgain(checked === true)}
						/>
						<label
							htmlFor="dont-show-again"
							className="text-sm text-muted-foreground cursor-pointer select-none"
						>
							Ne plus afficher ce tutoriel automatiquement
						</label>
					</div>

					{/* Progress bar */}
					<div className="space-y-2">
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Progression</span>
							<span>{Math.round(progress)}%</span>
						</div>
						<div className="w-full bg-muted rounded-full h-2">
							<div
								className="bg-primary h-2 rounded-full transition-all duration-300"
								style={{ width: `${progress}%` }}
							/>
						</div>
					</div>

					{/* Navigation buttons */}
					<div className="flex items-center justify-between">
						<Button
							variant="outline"
							size="sm"
							onClick={handlePrevious}
							disabled={isFirstStep}
						>
							<ChevronLeft className="h-4 w-4 mr-1" />
							Précédent
						</Button>

						<Button size="sm" onClick={handleNext} disabled={isLastStep}>
							Suivant
							<ChevronRight className="h-4 w-4 ml-1" />
						</Button>
					</div>

					{/* Dots navigation */}
					<div className="flex justify-center gap-1.5">
						{TUTORIAL_STEPS.map((_, index) => (
							<button
								key={index}
								onClick={() => goToStep(index)}
								className={cn(
									"w-2 h-2 rounded-full transition-all",
									index === currentStep
										? "bg-primary w-8"
										: "bg-muted hover:bg-muted-foreground/50"
								)}
								aria-label={`Aller à l'étape ${index + 1}`}
							/>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
