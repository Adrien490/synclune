import { CardTitle } from "@/shared/components/ui/card";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
import { cn } from "@/shared/utils/cn";

import { FORM_SECTION_TITLE_CLASS } from "./form-section-styles";

/**
 * Titre d'une section de formulaire admin — la signature « atelier ».
 *
 * ## Pourquoi ce composant existe
 *
 * Le tableau de bord admin écrit déjà ses titres au trait dessiné à la main
 * (`SectionHeading` → `HandDrawnAccent` + `HandDrawnUnderline`) et la barre latérale
 * signe en cursive (Kalam). Les FORMULAIRES, eux, restaient en `CardTitle` shadcn nu :
 * le vocabulaire de la marque entrait dans `/admin` et s'arrêtait à la porte de
 * l'endroit où Léane passe réellement son temps. C'était le diagnostic d'origine de
 * l'audit, et il n'avait été traité qu'à moitié — composition et couleur, jamais le
 * geste.
 *
 * Le trait est le `SquiggleUnderline` déjà partagé par `ProductCard` (polaroid) et
 * `CollectionCard` (planche-contact) : c'est littéralement le même tracé que la
 * boutique, pas une réinterprétation.
 *
 * ## Deux détails qui ne se devinent pas
 *
 * - `drawn` : sur une carte, le trait se dessine au survol et sert d'affordance de
 *   lien. Un titre de section n'est pas cliquable — il est donc forcé à l'état
 *   dessiné, sinon il resterait invisible en permanence.
 * - Le trait est masqué sous `md`. En dessous, les sections sont à plat et leur titre
 *   est une petite capitale grise servant d'étiquette : un trait manuscrit sous une
 *   étiquette de 14 px ferait décoration, pas signature.
 */
export function FormSectionTitle({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<CardTitle className={cn(FORM_SECTION_TITLE_CLASS, "relative inline-block", className)}>
			{children}
			<SquiggleUnderline drawn className="hidden md:block" />
		</CardTitle>
	);
}
