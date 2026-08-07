import Link from "next/link";

import { MaskingTape } from "@/shared/components/masking-tape";
import { Button } from "@/shared/components/ui/button";
import { BRAND } from "@/shared/constants/brand";
import { CARD_SURFACE_POLAROID } from "@/shared/components/card-surface.constants";
import { cn } from "@/shared/utils/cn";

/**
 * État vide de l'étal : zéro création publiée.
 *
 * @description
 * C'est le seul cas où la direction « L'étal » dégrade vers une adresse
 * directe — à ce moment-là il n'y a plus d'étal du tout, et une grille de
 * cadres vides ferait un stand abandonné. La cellule reste dans le même cadre
 * polaroid, ruban compris : la page ne change pas de langage visuel parce que
 * la base est vide.
 *
 * Le `mailto:` est la voie de contact retenue par le projet — la capture
 * d'adresse e-mail sur la home a été refusée explicitement (25 juin 2026), on
 * ne la remet pas sur la table ici.
 */
export function HeroEmptyCard() {
	return (
		<div className={cn(CARD_SURFACE_POLAROID, "pb-2 sm:pb-2.5")}>
			<MaskingTape className="-top-2 left-1/2 z-20 h-4 w-14 -translate-x-1/2 -rotate-2" />

			<div className="border-border rounded-sm border-2 border-dashed px-5 py-8 text-center sm:px-8 sm:py-10">
				<p className="font-display text-xl font-normal sm:text-2xl">
					L&apos;atelier remplit ses étagères
				</p>
				<p className="text-muted-foreground mx-auto mt-3 max-w-[46ch] text-sm leading-relaxed">
					Il n&apos;y a rien en ligne pour le moment. Écris-moi si tu cherches quelque chose de
					précis, je te réponds moi-même.
				</p>
				<Button
					className="mt-6"
					render={<Link href={`mailto:${BRAND.contact.email}`} />}
					data-testid="hero-empty-contact"
				>
					Écrire à Léane
				</Button>
			</div>
		</div>
	);
}
