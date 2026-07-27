"use client";

import { useRef, useState } from "react";
import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import { formatEuro } from "@/shared/utils/format-euro";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { Button } from "@/shared/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/utils/cn";
import { Check, ChevronRight, LoaderCircle, X } from "lucide-react";

interface CheckoutDiscountSectionProps {
	form: CheckoutFormInstance;
}

export function CheckoutDiscountSection({ form }: CheckoutDiscountSectionProps) {
	const haptic = useHaptic();
	const [liveMessage, setLiveMessage] = useState("");
	const [isApplying, setIsApplying] = useState(false);
	// Verrou de ré-entrance. Le state `isApplying` ne bascule qu'au re-render
	// suivant : insuffisant pour bloquer deux appels dans le même tick (Entrée
	// maintenue / double-tap). Même raisonnement que `useGatedFormSubmit`.
	const isApplyingRef = useRef(false);

	return (
		<>
			<span role="status" aria-live="polite" className="sr-only">
				{liveMessage}
			</span>
			<form.Subscribe selector={(s) => s.values._appliedDiscount}>
				{(appliedDiscount) => {
					if (appliedDiscount) {
						return (
							<div className="border-success/30 bg-success/10 flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5">
								<div className="flex min-w-0 items-center gap-2">
									<Check className="text-success size-4 shrink-0" aria-hidden="true" />
									<span className="text-success truncate text-sm font-medium">
										{appliedDiscount.code}
									</span>
									<span className="text-success text-sm">
										-{formatEuro(appliedDiscount.discountAmount)}
									</span>
								</div>
								<button
									type="button"
									onClick={() => {
										const removedCode = appliedDiscount.code;
										haptic("light");
										form.setFieldValue("_appliedDiscount", null);
										form.setFieldValue("discountCode", "");
										setLiveMessage(`Code promo ${removedCode} retiré`);
									}}
									className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
									aria-label="Supprimer le code promo"
								>
									<X className="size-4" />
								</button>
							</div>
						);
					}

					async function validateAndApply(rawCode: string) {
						const code = rawCode.trim().toUpperCase();
						if (!code) return;
						// Garde posée DANS la fonction, pas seulement sur le bouton : le
						// handler Entrée du champ appelle `validateAndApply` directement,
						// sans passer par le `disabled={isApplying}` du bouton — des
						// pressions répétées lançaient autant d'appels concurrents à
						// `validateDiscountCode`, avec application de la dernière réponse
						// arrivée (pas forcément la dernière émise).
						if (isApplyingRef.current) return;
						isApplyingRef.current = true;
						setIsApplying(true);
						const result = await validateDiscountCode(code);
						isApplyingRef.current = false;
						setIsApplying(false);
						if (result.valid && result.discount) {
							form.setFieldValue("_appliedDiscount", result.discount);
							form.setFieldValue("discountCode", "");
							form.setFieldMeta("discountCode", (prev) => ({ ...prev, errors: [] }));
							haptic("success");
							setLiveMessage(
								`Code ${code} validé : -${formatEuro(result.discount.discountAmount)}`,
							);
							return;
						}
						haptic("error");
						const message = result.error ?? "Code invalide";
						setLiveMessage(message);
						form.setFieldMeta("discountCode", (prev) => ({ ...prev, errors: [message] }));
					}

					return (
						<form.Subscribe selector={(s) => s.values._discountOpen}>
							{(isOpen) => (
								<Collapsible
									open={isOpen}
									onOpenChange={(v) => form.setFieldValue("_discountOpen", v)}
								>
									<CollapsibleTrigger className="text-muted-foreground hover:text-foreground -mx-3 inline-flex min-h-11 items-center gap-1 px-3 text-sm transition-colors">
										<ChevronRight
											className={cn("size-3.5 transition-transform", isOpen && "rotate-90")}
										/>
										J'ai un code promo
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="space-y-2 pt-1">
											<form.AppField name="discountCode">
												{(field) => (
													// `items-end` : le champ porte désormais un label visible, donc il
													// est plus haut que le bouton — l'alignement par défaut (stretch)
													// étirait le bouton sur label + input.
													<div className="flex items-end gap-2">
														<field.InputField
															label="Code promo"
															placeholder="Entrer un code"
															className="uppercase"
															autoCapitalize="characters"
															autoComplete="off"
															autoCorrect="off"
															spellCheck={false}
															enterKeyHint="send"
															maxLength={30}
															onKeyDown={(e: React.KeyboardEvent) => {
																if (e.key === "Enter") {
																	e.preventDefault();
																	void validateAndApply(field.state.value as string);
																}
															}}
														/>
														<Button
															type="button"
															variant="outline"
															disabled={isApplying || !(field.state.value as string).trim()}
															aria-busy={isApplying}
															onClick={() => void validateAndApply(field.state.value as string)}
														>
															{isApplying ? (
																<>
																	<LoaderCircle
																		className="size-4 motion-safe:animate-spin"
																		aria-hidden="true"
																	/>
																	<span>Validation…</span>
																</>
															) : (
																"Appliquer"
															)}
														</Button>
													</div>
												)}
											</form.AppField>
										</div>
									</CollapsibleContent>
								</Collapsible>
							)}
						</form.Subscribe>
					);
				}}
			</form.Subscribe>
		</>
	);
}
