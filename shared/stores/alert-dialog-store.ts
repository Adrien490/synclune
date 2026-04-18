import { createStore } from "zustand/vanilla";
import { devtools } from "zustand/middleware";

import type {
	AlertDialogData,
	AlertDialogState,
	AlertDialogStore,
} from "@/shared/types/store.types";
import {
	openEntry,
	closeEntry,
	clearEntry,
	isEntryOpen,
	getEntryData,
} from "./overlay-state-helpers";

export type { AlertDialogData, AlertDialogStore } from "@/shared/types/store.types";

export const defaultInitState: AlertDialogState = {
	alertDialogs: {},
};

export const createAlertDialogStore = (initState: AlertDialogState = defaultInitState) => {
	return createStore<AlertDialogStore>()(
		devtools(
			(set, get) => ({
				...initState,
				openAlertDialog: (dialogId: string, data?: AlertDialogData) =>
					set(
						(state) => ({ alertDialogs: openEntry(state.alertDialogs, dialogId, data) }),
						false,
						`openAlertDialog/${dialogId}`,
					),
				closeAlertDialog: (dialogId: string) =>
					set(
						(state) => ({ alertDialogs: closeEntry(state.alertDialogs, dialogId) }),
						false,
						`closeAlertDialog/${dialogId}`,
					),
				isAlertDialogOpen: (dialogId: string) => isEntryOpen(get().alertDialogs, dialogId),
				getAlertDialogData: <T extends AlertDialogData = AlertDialogData>(
					dialogId: string,
				): T | undefined => getEntryData<AlertDialogData, T>(get().alertDialogs, dialogId),
				clearAlertDialogData: (dialogId: string) =>
					set(
						(state) => ({ alertDialogs: clearEntry(state.alertDialogs, dialogId) }),
						false,
						`clearAlertDialogData/${dialogId}`,
					),
			}),
			{ name: "AlertDialogStore", enabled: process.env.NODE_ENV === "development" },
		),
	);
};
