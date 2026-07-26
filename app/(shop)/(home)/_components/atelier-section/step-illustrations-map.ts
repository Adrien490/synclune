// Map extraite du fichier de composants : un module qui exporte à la fois des
// composants et des non-composants casse le Fast Refresh (rechargement complet).
import type { ComponentType } from "react";

import {
	AssemblyIllustration,
	DrawingIllustration,
	FinishingIllustration,
	IdeaIllustration,
	type StepIllustrationProps,
} from "./step-illustrations";

export const STEP_ILLUSTRATIONS: Record<string, ComponentType<StepIllustrationProps>> = {
	idea: IdeaIllustration,
	drawing: DrawingIllustration,
	assembly: AssemblyIllustration,
	finishing: FinishingIllustration,
};
