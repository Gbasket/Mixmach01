import { useLoaderData, useSubmit, Form } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { useState } from "react";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  // Collections fetch करें
  const response = await admin.graphql(`
    query {
      collections(first: 50) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `);
  const data = await response.json();
  const collections = data.data.collections.edges.map((e) => e.node);

  const rules = await db.discountRule.findMany({
    orderBy: { quantity: "asc" },
  });

  return { rules, collections };
}

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    await db.discountRule.create({
      data: {
        quantity: parseInt(formData.get("quantity")),
        price: parseFloat(formData.get("price")),
        collectionId: formData.get("collectionId"),
        collectionTitle: formData.get("collectionTitle"),
      },
    });
  }

  if (intent === "delete") {
    await db.discountRule.delete({
      where: { id: formData.get("id") },
    });
  }

  if (intent === "toggle") {
    const rule = await db.discountRule.findUnique({
      where: { id: formData.get("id") },
    });
    await db.discountRule.update({
      where: { id: formData.get("id") },
      data: { isActive: !rule?.isActive },
    });
  }

  const activeRules = await db.discountRule.findMany({
    where: { isActive: true },
    orderBy: { quantity: "asc" },
  });

  const shopResponse = await admin.graphql(`query { shop { id } }`);
  const shopData = await shopResponse.json();
  const shopId = shopData.data.shop.id;

  const metafieldResponse = await admin.graphql(`
    mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `, {
    variables: {
      metafields: [{
        namespace: "discount_rules",
        key: "bundle_rules",
        type: "json",
        value: JSON.stringify(activeRules.map(r => ({
          quantity: r.quantity,
          price: r.price,
          collectionId: r.collectionId,
        }))),
        ownerId: shopId,
      }]
    }
  });

  const metafieldData = await metafieldResponse.json();
  const metafieldErrors = metafieldData.data.metafieldsSet.userErrors;
  if (metafieldErrors.length > 0) {
    return { success: false, errors: metafieldErrors };
  }

  return { success: true };
}

export default function Dashboard() {
  const { rules, collections } = useLoaderData();
  const submit = useSubmit();
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");

  const selectedCol = collections.find((c) => c.id === selectedCollection);

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif", maxWidth: "650px" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "24px" }}>🎯 Discount Rules Dashboard</h1>

      {/* Add New Rule */}
      <div style={{ background: "#f6f6f7", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
        <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>➕ नया Rule बनाएं</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <input
              type="number"
              placeholder="Quantity (जैसे 3)"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "150px" }}
            />
            <input
              type="number"
              placeholder="Price ₹ (जैसे 499)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "150px" }}
            />
          </div>

          {/* Collection Selector */}
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc", width: "100%" }}
          >
            <option value="">-- Collection select करें --</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (!qty || !price || !selectedCollection) {
                alert("सभी fields भरें!");
                return;
              }
              submit({
                intent: "create",
                quantity: qty,
                price: price,
                collectionId: selectedCollection,
                collectionTitle: selectedCol?.title || "",
              }, { method: "post" });
              setQty("");
              setPrice("");
              setSelectedCollection("");
            }}
            style={{ padding: "8px 16px", background: "#008060", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", width: "120px" }}
          >
            Add Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <h2 style={{ fontSize: "16px", marginBottom: "12px" }}>📋 Current Rules</h2>
      {rules.length === 0 && <p style={{ color: "#666" }}>कोई rule नहीं है। ऊपर से add करें!</p>}
      {rules.map((rule) => (
        <div key={rule.id} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: rule.isActive ? "#e3f1df" : "#f6f6f7",
          borderRadius: "8px", marginBottom: "8px", border: `1px solid ${rule.isActive ? "#008060" : "#ccc"}`
        }}>
          <div>
            <span style={{ fontSize: "16px" }}>
              Any <strong>{rule.quantity}</strong> for <strong>₹{rule.price}</strong>
              {rule.isActive ? " ✅" : " ⏸️"}
            </span>
            <br />
            <span style={{ fontSize: "12px", color: "#666" }}>
              📁 {rule.collectionTitle}
            </span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Form method="post">
              <input type="hidden" name="intent" value="toggle" />
              <input type="hidden" name="id" value={rule.id} />
              <button type="submit" style={{ padding: "6px 12px", background: "#fff", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}>
                {rule.isActive ? "Pause" : "Activate"}
              </button>
            </Form>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={rule.id} />
              <button type="submit" style={{ padding: "6px 12px", background: "#d72c0d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                Delete
              </button>
            </Form>
          </div>
        </div>
      ))}
    </div>
  );
}
