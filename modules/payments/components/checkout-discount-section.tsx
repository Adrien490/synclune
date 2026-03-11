"use client";

import type { CheckoutFormInstance } from "../hooks/use-checkout-form";
import type { GetCartReturn } from "@/modules/cart/data/get-cart";
import { validateDiscountCode } from "@/modules/discounts/actions/validate-discount-code";
import { formatEuro } from "@/shared/utils/format-euro";
import { Button } from "@/shared/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/utils/cn";
import { Check, ChevronRight, Loader2, X } from "lucide-react";

interface CheckoutDiscountSectionProps {
	form: CheckoutFormInstance;
	cart: NonNullable<GetCartReturn>;
}

export function CheckoutDiscountSection({ form, cart }: CheckoutDiscountSectionProps) {
	const subtotal = cart.items.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);

	return (
		<form.Subscribe selector={(s) => s.values._appliedDiscount}>
			{(appliedDiscount) => {
				if (appliedDiscount) {
					return (
						<div className="flex items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5">
							<div className="flex min-w-0 items-center gap-2">
								<Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
								<span className="truncate text-sm font-medium text-green-700">
									{appliedDiscount.code}
								</span>
								<span className="text-sm text-green-600">
									-{formatEuro(appliedDiscount.discountAmount)}
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									form.setFieldValue("_appliedDiscount", null);
									form.setFieldValue("discountCode", "");
								}}
								className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm p-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								aria-label="Supprimer le code promo"
							>
								<X className="h-4 w-4" />
							</button>
						</div>
					);
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
										className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
									/>
									J'ai un code promo
								</CollapsibleTrigger>
								<CollapsibleContent>
									<div className="space-y-2 pt-1">
										<form.AppField
											name="discountCode"
											validators={{
												onBlurAsync: async ({ value, fieldApi }) => {
													const code = (value as string).trim().toUpperCase();
													if (!code) return undefined;
													const result = await validateDiscountCode(code, subtotal);
													if (result.valid && result.discount) {
														fieldApi.form.setFieldValue("_appliedDiscount", result.discount);
														fieldApi.form.setFieldValue("discountCode", "");
														return undefined;
													}
													return result.error ?? "Code invalide";
												},
											}}
										>
											{(field) => (
												<div className="flex gap-2">
													<field.InputField
														placeholder="Entrer un code"
														className="uppercase"
														aria-label="Code promo"
														onKeyDown={(e: React.KeyboardEvent) => {
															if (e.key === "Enter") {
																e.preventDefault();
																field.handleBlur();
															}
														}}
													/>
													<Button
														type="button"
														variant="outline"
														disabled={
															field.state.meta.isValidating || !(field.state.value as string).trim()
														}
														onClick={() => field.handleBlur()}
													>
														{field.state.meta.isValidating ? (
															<Loader2 className="h-4 w-4 motion-safe:animate-spin" />
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
	);
}
