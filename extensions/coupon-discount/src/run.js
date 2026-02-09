// @ts-check

import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @type {{
 *   discountApplicationStrategy: DiscountApplicationStrategy,
 *   discounts: []
 * }}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * Applies coupon discounts (percentage or fixed amount) at checkout.
 *
 * @param {RunInput} input - The function input from Shopify
 * @returns {FunctionRunResult} The discount to apply
 */
export default function run(input) {
  const config = JSON.parse(
    input?.discountNode?.metafield?.value ?? "{}"
  );

  const { discountType, discountValue, minimumPurchase } = config;

  if (!discountType || !discountValue) {
    return EMPTY_DISCOUNT;
  }

  const subtotal = parseFloat(input.cart.cost.subtotalAmount.amount);

  if (minimumPurchase && subtotal < minimumPurchase) {
    return EMPTY_DISCOUNT;
  }

  const targets = input.cart.lines.map((line) => ({
    cartLine: { id: line.id },
  }));

  if (!targets.length) {
    return EMPTY_DISCOUNT;
  }

  const value =
    discountType === "percentage"
      ? { percentage: { value: discountValue.toString() } }
      : { fixedAmount: { amount: discountValue.toString() } };

  return {
    discounts: [
      {
        targets,
        value,
        message: config.title || "Coupon discount",
      },
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.First,
  };
}
