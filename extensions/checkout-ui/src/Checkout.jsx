import '@shopify/ui-extensions/preact';
import {render} from 'preact';

export default function extension() {
  render(<Extension />, document.body);
}

function Extension() {
  if (!shopify.instructions.value.discounts.canUpdateDiscountCodes) {
    return (
      <s-banner tone="warning">
        Discount code apply is not supported in this checkout.
      </s-banner>
    );
  }

  const code = 'SAVE10';

  const handleClick = async () => {
    const result = await shopify.applyDiscountCodeChange({
      type: 'addDiscountCode',
      code: code.toUpperCase(),
    });

    if (result?.type === 'error') {
      console.error(result.message);
    }
  };

  return (
    <s-stack gap="base">
      <s-banner heading="Special offer">
        Get 10% off on your first order.
      </s-banner>

      <s-button onClick={handleClick}>
        Apply {code}
      </s-button>
    </s-stack>
  );
}