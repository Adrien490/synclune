"use client";

import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Info, PackageOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface ProductTabsProps {
	slug: string;
	variantsCount: number;
}

export function ProductTabs({ slug, variantsCount }: ProductTabsProps) {
	const pathname = usePathname();
	const router = useRouter();

	// Détermine quel tab est actif en fonction du pathname
	const activeTab = pathname.includes("/variantes") ? "variantes" : "modifier";

	const handleTabChange = (value: string) => {
		if (value === "modifier") {
			router.push(`/admin/catalogue/produits/${slug}/modifier`);
		} else if (value === "variantes") {
			router.push(`/admin/catalogue/produits/${slug}/variantes`);
		}
	};

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
			<TabsList className="grid w-full max-w-md grid-cols-2">
				<TabsTrigger value="modifier" className="flex items-center gap-2">
					<Info className="h-4 w-4" />
					Informations
				</TabsTrigger>
				<TabsTrigger value="variantes" className="flex items-center gap-2">
					<PackageOpen className="h-4 w-4" />
					Variantes ({variantsCount})
				</TabsTrigger>
			</TabsList>
		</Tabs>
	);
}
