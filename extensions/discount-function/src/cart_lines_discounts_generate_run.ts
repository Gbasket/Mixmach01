import type { RunInput } from "../generated/api";
import { ProductDiscountSelectionStrategy } from "../generated/api";

export function cartLinesDiscountsGenerateRun(input: RunInput) {
  const rulesJson = input.shop.metafield?.value;
  if (!rulesJson) return { operations: [] };

  const rules: { quantity: number; price: number; collectionId: string }[] =
    JSON.parse(rulesJson);
  if (rules.length === 0) return { operations: [] };

  const operations = [];

  for (const rule of rules) {
    // ✅ Sirf is rule ki collection ke products filter karein
    const eligibleLines = input.cart.lines.filter(
      (line) =>
        line.merchandise.__typename === "ProductVariant" &&
        line.merchandise.product.inCollections.some(
          (c) => c.collectionId === rule.collectionId && c.isMember
        )
    );




    const totalQty = eligibleLines.reduce((sum, line) => sum + line.quantity, 0);
    if (totalQty < rule.quantity) continue;

    const bundleCount = Math.floor(totalQty / rule.quantity);

    // ✅ Remaining quantity track karein per line
    const lineRemaining: Record<string, number> = {};
    for (const line of eligibleLines) {
      lineRemaining[line.id] = line.quantity;
    }

    for (let b = 0; b < bundleCount; b++) {
      let remaining = rule.quantity;
      const targets: { cartLine: { id: string } }[] = [];
      let bundleTotal = 0;

      for (const line of eligibleLines) {
        if (remaining <= 0) break;
        const availableQty = lineRemaining[line.id];
        if (availableQty <= 0) continue;

        const pricePerItem =
          parseFloat(line.cost.totalAmount.amount) / line.quantity;
        const takeQty = Math.min(remaining, availableQty);

        targets.push({ cartLine: { id: line.id } });
        bundleTotal += pricePerItem * takeQty;
        remaining -= takeQty;
        lineRemaining[line.id] -= takeQty; // ✅ Used qty track karein
      }

      if (targets.length === 0) continue;

      const discountValue = bundleTotal - rule.price;
      if (discountValue <= 0) continue;

      operations.push({
        productDiscountsAdd: {
          candidates: [
            {
              message: `Any ${rule.quantity} for ₹${rule.price}`,
              targets,
              value: {
                fixedAmount: {
                  amount: discountValue.toFixed(2),
                  appliesToEachItem: false,
                },
              },
            },
          ],
          selectionStrategy: ProductDiscountSelectionStrategy.First,
        },
      });
    }
  }

  return { operations };
}
