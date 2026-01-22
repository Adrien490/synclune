"use client";

import type { NavItemChild } from "@/shared/constants/navigation";
import { MegaMenuColumn } from "./mega-menu-column";

interface MegaMenuCreationsProps {
	productTypes?: NavItemChild[];
}

export function MegaMenuCreations({ productTypes }: MegaMenuCreationsProps) {
	if (!productTypes || productTypes.length === 0) {
		return null;
	}

	return (
		<div className="py-6">
			<div className="grid grid-cols-4 gap-8">
				<MegaMenuColumn
					title="Catégories"
					items={productTypes}
				/>

				{/* Colonnes disponibles pour contenu futur */}
				<div className="col-span-3">
					{/* Contenu à enrichir */}
				</div>
			</div>
		</div>
	);
}
