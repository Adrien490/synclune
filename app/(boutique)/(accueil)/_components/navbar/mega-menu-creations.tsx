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
      <MegaMenuColumn title="Catégories" items={productTypes} />
    </div>
  );
}
