import { redirect } from "react-router";
import { useSubmit, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";

export async function action({ request, params }: any) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    mutation discountAutomaticAppCreate($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
    variables: {
      discount: {
        title: "Any 3 for ₹499",
        functionId: params.functionId,
        startsAt: new Date().toISOString(),
        discountClasses: ["PRODUCT"],
      },
    },
  });

  const data = await response.json();
  const errors = data.data.discountAutomaticAppCreate.userErrors;

  if (errors.length > 0) {
    return Response.json({ errors });
  }

  return redirect("/app");
}


export default function DiscountNew() {
  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Any 3 for ₹499 Discount</h2>
      <p>यह discount automatically Buy3only499 collection के किसी भी 3 products पर ₹499 apply करेगा।</p>
      <ul>
        <li>Collection: Buy3only499</li>
        <li>Any 3 products चुनें</li>
        <li>Total: ₹499</li>
        <li>Type: Automatic</li>
      </ul>
      <button
        onClick={() => submit({}, { method: "post" })}
        disabled={isLoading}
        style={{
          padding: "10px 20px",
          backgroundColor: "#008060",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px"
        }}
      >
        {isLoading ? "Creating..." : "Activate Discount"}
      </button>
    </div>
  );
}
