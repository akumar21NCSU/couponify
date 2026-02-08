interface AdminGraphQL {
  graphql: (
    query: string,
    options?: { variables: Record<string, unknown> },
  ) => Promise<Response>;
}

interface CouponDiscountInput {
  title: string;
  code: string;
  discountType: string;
  discountValue: number;
  minimumPurchase: number | null;
  usageLimit: number | null;
  startsAt: Date | string;
  endsAt: Date | string | null;
}

interface DiscountUserError {
  field: string[];
  message: string;
}

function toISOString(date: Date | string): string {
  return date instanceof Date ? date.toISOString() : date;
}

export async function getFunctionId(admin: AdminGraphQL): Promise<string> {
  const response = await admin.graphql(
    `#graphql
    query {
      shopifyFunctions(first: 25) {
        nodes {
          id
          title
          apiType
        }
      }
    }`,
  );

  const { data } = await response.json();
  const functions = data.shopifyFunctions.nodes as {
    id: string;
    title: string;
    apiType: string;
  }[];

  const match = functions.find((fn) => fn.apiType === "product_discounts");
  if (!match) {
    throw new Error(
      "Coupon discount function not found. Has the extension been deployed?",
    );
  }

  return match.id;
}

export async function createShopifyDiscount(
  admin: AdminGraphQL,
  functionId: string,
  coupon: CouponDiscountInput,
): Promise<{ id: string; userErrors: DiscountUserError[] }> {
  const metafieldValue = JSON.stringify({
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumPurchase: coupon.minimumPurchase,
  });

  const response = await admin.graphql(
    `#graphql
    mutation discountCodeAppCreate($codeAppDiscount: DiscountCodeAppInput!) {
      discountCodeAppCreate(codeAppDiscount: $codeAppDiscount) {
        codeAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        codeAppDiscount: {
          title: coupon.title,
          code: coupon.code,
          functionId,
          startsAt: toISOString(coupon.startsAt),
          endsAt: coupon.endsAt ? toISOString(coupon.endsAt) : null,
          usageLimit: coupon.usageLimit,
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: "$app:coupon-discount",
              key: "function-configuration",
              type: "json",
              value: metafieldValue,
            },
          ],
        },
      },
    },
  );

  const { data } = await response.json();
  const result = data.discountCodeAppCreate;

  return {
    id: result.codeAppDiscount?.discountId ?? "",
    userErrors: result.userErrors,
  };
}

export async function updateShopifyDiscount(
  admin: AdminGraphQL,
  shopifyDiscountId: string,
  coupon: CouponDiscountInput,
): Promise<{ id: string; userErrors: DiscountUserError[] }> {
  const metafieldValue = JSON.stringify({
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumPurchase: coupon.minimumPurchase,
  });

  const response = await admin.graphql(
    `#graphql
    mutation discountCodeAppUpdate($id: ID!, $codeAppDiscount: DiscountCodeAppInput!) {
      discountCodeAppUpdate(id: $id, codeAppDiscount: $codeAppDiscount) {
        codeAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        id: shopifyDiscountId,
        codeAppDiscount: {
          title: coupon.title,
          code: coupon.code,
          startsAt: toISOString(coupon.startsAt),
          endsAt: coupon.endsAt ? toISOString(coupon.endsAt) : null,
          usageLimit: coupon.usageLimit,
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: false,
            shippingDiscounts: true,
          },
          metafields: [
            {
              namespace: "$app:coupon-discount",
              key: "function-configuration",
              type: "json",
              value: metafieldValue,
            },
          ],
        },
      },
    },
  );

  const { data } = await response.json();
  const result = data.discountCodeAppUpdate;

  return {
    id: result.codeAppDiscount?.discountId ?? "",
    userErrors: result.userErrors,
  };
}

export async function deleteShopifyDiscount(
  admin: AdminGraphQL,
  shopifyDiscountId: string,
): Promise<{ deletedId: string; userErrors: DiscountUserError[] }> {
  const response = await admin.graphql(
    `#graphql
    mutation discountCodeDelete($id: ID!) {
      discountCodeDelete(id: $id) {
        deletedCodeDiscountId
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: { id: shopifyDiscountId },
    },
  );

  const { data } = await response.json();
  const result = data.discountCodeDelete;

  return {
    deletedId: result.deletedCodeDiscountId ?? "",
    userErrors: result.userErrors,
  };
}

export async function activateShopifyDiscount(
  admin: AdminGraphQL,
  shopifyDiscountId: string,
): Promise<{ userErrors: DiscountUserError[] }> {
  const response = await admin.graphql(
    `#graphql
    mutation discountCodeActivate($id: ID!) {
      discountCodeActivate(id: $id) {
        codeDiscountNode {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: { id: shopifyDiscountId },
    },
  );

  const { data } = await response.json();
  const result = data.discountCodeActivate;

  return { userErrors: result.userErrors };
}

export async function deactivateShopifyDiscount(
  admin: AdminGraphQL,
  shopifyDiscountId: string,
): Promise<{ userErrors: DiscountUserError[] }> {
  const response = await admin.graphql(
    `#graphql
    mutation discountCodeDeactivate($id: ID!) {
      discountCodeDeactivate(id: $id) {
        codeDiscountNode {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: { id: shopifyDiscountId },
    },
  );

  const { data } = await response.json();
  const result = data.discountCodeDeactivate;

  return { userErrors: result.userErrors };
}
