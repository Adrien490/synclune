// Map extraite du fichier de composants : un module qui exporte à la fois des
// composants et des non-composants casse le Fast Refresh (rechargement complet).
import type { ComponentType } from "react";

import {
	HandsIllustration,
	InspirationIllustration,
	MaterialsIllustration,
	WorkspaceIllustration,
	type PolaroidIllustrationProps,
} from "./polaroid-illustrations";

export const POLAROID_ILLUSTRATIONS: Record<string, ComponentType<PolaroidIllustrationProps>> = {
	hands: HandsIllustration,
	materials: MaterialsIllustration,
	inspiration: InspirationIllustration,
	workspace: WorkspaceIllustration,
};
