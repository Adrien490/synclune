import { getQuickSearchData } from "@/modules/products/data/get-quick-search-data";

import { QuickSearchDialog } from "./quick-search-dialog";

export async function QuickSearchDialogAsync() {
	const data = await getQuickSearchData();

	return <QuickSearchDialog {...data} />;
}
