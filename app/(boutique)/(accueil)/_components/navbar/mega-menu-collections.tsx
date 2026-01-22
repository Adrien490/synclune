"use client";

import type { NavItemChild } from "@/shared/constants/navigation";
import { MegaMenuColumn } from "./mega-menu-column";

interface MegaMenuCollectionsProps {
	collections?: NavItemChild[];
}

export function MegaMenuCollections({ collections }: MegaMenuCollectionsProps) {
	// Exclure "Toutes les collections"
	const filteredCollections = collections?.filter((c) => c.href !== "/collections");

	if (!filteredCollections || filteredCollections.length === 0) {
		return null;
	}

	return (
		<div className="py-6">
			<div className="grid grid-cols-4 gap-8">
				<MegaMenuColumn
					title="Collections"
					items={filteredCollections}
					viewAllLink={{
						href: "/collections",
						label: "Voir toutes les collections",
					}}
				/>

				{/* Colonnes disponibles pour contenu futur */}
				<div className="col-span-3">
					{/* Contenu à enrichir */}
				</div>
			</div>
		</div>
	);
}
