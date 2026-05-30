import '@shopify/ui-extensions/preact';
import { render } from "preact";
import { useState, useEffect } from 'preact/hooks';

export default async () => {
  render(<UpsellProducts />, document.body);
};

function UpsellProducts() {
  const { applyCartLinesChange, lines } = shopify;
  const [queue, setQueue] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);

  const COLLECTION_HANDLE = 'upsell-products';

  useEffect(() => {
    async function fetchCollectionProducts() {
      setLoading(true);
      try {
        const query = `
          query getCollection($handle: String!) {
            collectionByHandle(handle: $handle) {
              products(first: 10) {
                nodes {
                  id
                  title
                  featuredImage { url }
                  variants(first: 1) {
                    nodes {
                      id
                      price { amount currencyCode }
                    }
                  }
                }
              }
            }
          }
        `;

        const res = await fetch('shopify:storefront/api/graphql.json', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { handle: COLLECTION_HANDLE } }),
        });

        const { data } = await res.json();
        const products = data.collectionByHandle?.products?.nodes ?? [];
        setQueue(products);
      } catch (error) {
        console.error('Error fetching collection products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCollectionProducts();
  }, []);

  if (loading) {
    return <s-text>Loading upsell offer...</s-text>;
  }

  if (!queue.length) return null;

  return (
    <s-stack gap="base">
      {queue.map((product) => {
        const variantId = product.variants.nodes[0]?.id;
        const inCart = lines.value.some((line) => line.merchandise.id === variantId);

        if (inCart) return null;

        return (
          <s-grid
            key={product.id}
            gridTemplateColumns="0.4fr 1fr auto"
            gap="base"
            border="base"
            borderStyle="dashed"
            alignItems="center"
            padding="small"
          >
            <s-grid-item>
              <s-image src={product.featuredImage?.url} alt={product.title} />
            </s-grid-item>

            <s-grid-item>
              <s-heading>{product.title}</s-heading>
              <s-text>
                {product.variants.nodes[0].price.amount}{" "}
                {product.variants.nodes[0].price.currencyCode}
              </s-text>
            </s-grid-item>

            <s-grid-item>
              <s-button
                onClick={async () => {
                  await applyCartLinesChange({
                    type: "addCartLine",
                    merchandiseId: variantId,
                    quantity: 1,
                  });
                }}
              >
                Add to Cart
              </s-button>
            </s-grid-item>
          </s-grid>
        );
      })}
    </s-stack>
  );
}
