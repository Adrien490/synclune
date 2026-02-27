import { cn } from "@/shared/utils/cn";
import { CheckCircle, Hammer, Lightbulb, Pencil, Sparkles } from "lucide-react";
import { CreativeProcessGlitter } from "./creative-process-glitter";
import { MobileStepCircle } from "./mobile-step-circle";
import { processSteps } from "./process-steps";

const STEP_ICONS = [
	<Lightbulb key="lightbulb" className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
	<Pencil key="pencil" className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
	<Hammer key="hammer" className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
	<CheckCircle key="check" className="w-6 h-6 motion-safe:transition-[color,filter,transform] motion-safe:duration-300" aria-hidden="true" />,
];

export function CreativeProcessTimeline() {
	const isLast = (index: number) => index === processSteps.length - 1;

	return (
		<div className="mt-8 sm:mt-12">
			{/* Desktop: horizontal grid (lg+) */}
			<div className="hidden lg:block relative">
				{/* Decorative horizontal line connecting the circles */}
				<div
					className="absolute top-6 left-[calc(12.5%-12px)] right-[calc(12.5%-12px)] h-px bg-secondary/30 z-0"
					aria-hidden="true"
				/>
				<ol className="relative z-10 grid grid-cols-4 gap-6 list-none">
				{processSteps.map((step, index) => (
					<li
						key={step.id}
						id={`creative-step-${step.id}`}
						className="group relative text-center rounded-xl p-3 motion-safe:transition-[background-color,transform] motion-safe:duration-300 motion-safe:hover:bg-muted/30 motion-safe:hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
					>
						<span className="sr-only">Étape {index + 1} :</span>

						{/* Icon circle */}
						<div
							className={cn(
								"relative z-10 mx-auto flex w-12 h-12 rounded-full border-2 items-center justify-center motion-safe:transition-[transform,box-shadow] motion-safe:duration-300",
								step.color,
								"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
								step.iconHoverClass,
								step.glowClass,
								step.intensity.ring,
								step.intensity.shadow,
							)}
						>
							{STEP_ICONS[index]}
							{isLast(index) && <CreativeProcessGlitter />}
						</div>

						{/* Title + description */}
						<h3 className="mt-4 text-lg/6 font-semibold text-foreground tracking-tight antialiased">
							{step.title}
							{isLast(index) && (
								<Sparkles
									className="inline-block w-4 h-4 ml-1.5 text-secondary opacity-70 motion-safe:transition-opacity group-hover:opacity-100"
									aria-hidden="true"
								/>
							)}
						</h3>
						<p className="mt-2 text-sm/6 tracking-normal antialiased text-muted-foreground">
							{step.description}
						</p>
					</li>
				))}
				</ol>
			</div>

			{/* Mobile: vertical timeline */}
			<div className="lg:hidden relative">
				{/* Static vertical line */}
				<div
					className="absolute left-6 top-8 bottom-8 w-px bg-secondary/50 sm:hidden"
					aria-hidden="true"
				/>

				<ol className="space-y-8 sm:space-y-12 list-none">
					{processSteps.map((step, index) => (
						<li
							key={step.id}
							id={`creative-step-${step.id}-mobile`}
							className="flex items-start gap-4 group relative rounded-xl p-2 -m-2 motion-safe:transition-[background-color,transform] motion-safe:duration-300 motion-safe:hover:bg-muted/30 motion-safe:hover:-translate-y-0.5 active:bg-muted/40 active:scale-[0.99]"
						>
							<span className="sr-only">Étape {index + 1} :</span>

							{/* Desktop (sm-lg): icon circles */}
							<div
								className={cn(
									"hidden sm:flex lg:hidden shrink-0 w-12 h-12 rounded-full border-2 items-center justify-center motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 relative z-20",
									step.color,
									"motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-3",
									step.iconHoverClass,
									step.glowClass,
									step.intensity.ring,
									step.intensity.shadow,
								)}
							>
								{STEP_ICONS[index]}
								{isLast(index) && (
									<div className="hidden sm:block">
										<CreativeProcessGlitter />
									</div>
								)}
							</div>

							{/* Mobile: animated number circles */}
							<MobileStepCircle index={index} color={step.color} intensity={step.intensity} />

							<div className="flex-1 pb-8">
								<h3 className="text-xl/7 font-semibold text-foreground mb-2 tracking-tight antialiased">
									<span className="hidden sm:inline lg:hidden" aria-hidden="true">
										{index + 1}.{" "}
									</span>
									{step.title}
									{isLast(index) && (
										<Sparkles
											className="inline-block w-4 h-4 ml-1.5 text-secondary opacity-70 motion-safe:transition-opacity group-hover:opacity-100"
											aria-hidden="true"
										/>
									)}
								</h3>
								<p className="text-base/7 tracking-normal antialiased text-muted-foreground">
									{step.description}
								</p>
							</div>
						</li>
					))}
				</ol>
			</div>
		</div>
	);
}
