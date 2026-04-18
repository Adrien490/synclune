"use client";

import * as React from "react";

const VaulNestedContext = React.createContext(false);

export function useIsInsideVaul() {
	return React.useContext(VaulNestedContext);
}

export function VaulNestedProvider({ children }: { children: React.ReactNode }) {
	return <VaulNestedContext.Provider value={true}>{children}</VaulNestedContext.Provider>;
}
