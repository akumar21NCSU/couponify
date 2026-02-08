import { describe, it, expect, vi } from "vitest";
import {
  getFunctionId,
  createShopifyDiscount,
  updateShopifyDiscount,
  deleteShopifyDiscount,
  activateShopifyDiscount,
  deactivateShopifyDiscount,
} from "./shopify-discount.server";

function mockAdmin(responseData: unknown) {
  return {
    graphql: vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: responseData }),
    }),
  };
}

describe("getFunctionId", () => {
  it("returns function ID matching product_discounts apiType", async () => {
    const admin = mockAdmin({
      shopifyFunctions: {
        nodes: [
          { id: "gid://fn/1", title: "Order Discount", apiType: "order_discounts" },
          { id: "gid://fn/2", title: "Coupon Discount", apiType: "product_discounts" },
        ],
      },
    });

    const result = await getFunctionId(admin);
    expect(result).toBe("gid://fn/2");
  });

  it("throws when no matching function found", async () => {
    const admin = mockAdmin({
      shopifyFunctions: {
        nodes: [
          { id: "gid://fn/1", title: "Order Discount", apiType: "order_discounts" },
        ],
      },
    });

    await expect(getFunctionId(admin)).rejects.toThrow(
      "Coupon discount function not found. Has the extension been deployed?",
    );
  });

  it("calls shopifyFunctions query", async () => {
    const admin = mockAdmin({
      shopifyFunctions: {
        nodes: [
          { id: "gid://fn/2", title: "Coupon Discount", apiType: "product_discounts" },
        ],
      },
    });

    await getFunctionId(admin);
    expect(admin.graphql).toHaveBeenCalledOnce();
    expect(admin.graphql.mock.calls[0][0]).toContain("shopifyFunctions");
  });
});

describe("createShopifyDiscount", () => {
  const coupon = {
    title: "Summer Sale",
    code: "SUMMER2025",
    discountType: "percentage",
    discountValue: 15,
    minimumPurchase: 50,
    usageLimit: 100,
    startsAt: "2025-06-01T00:00:00.000Z",
    endsAt: "2025-12-31T00:00:00.000Z",
  };

  it("returns discount ID on success", async () => {
    const admin = mockAdmin({
      discountCodeAppCreate: {
        codeAppDiscount: { discountId: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    const result = await createShopifyDiscount(admin, "gid://fn/2", coupon);
    expect(result.id).toBe("gid://shopify/DiscountCodeApp/123");
    expect(result.userErrors).toEqual([]);
  });

  it("returns userErrors on failure", async () => {
    const admin = mockAdmin({
      discountCodeAppCreate: {
        codeAppDiscount: null,
        userErrors: [{ field: ["code"], message: "Code already exists" }],
      },
    });

    const result = await createShopifyDiscount(admin, "gid://fn/2", coupon);
    expect(result.id).toBe("");
    expect(result.userErrors).toEqual([
      { field: ["code"], message: "Code already exists" },
    ]);
  });

  it("passes correct metafield with discount config", async () => {
    const admin = mockAdmin({
      discountCodeAppCreate: {
        codeAppDiscount: { discountId: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    await createShopifyDiscount(admin, "gid://fn/2", coupon);

    const variables = admin.graphql.mock.calls[0][1]?.variables;
    const metafield = variables.codeAppDiscount.metafields[0];
    expect(metafield.namespace).toBe("$app:coupon-discount");
    expect(metafield.key).toBe("function-configuration");
    expect(metafield.type).toBe("json");
    expect(JSON.parse(metafield.value)).toEqual({
      discountType: "percentage",
      discountValue: 15,
      minimumPurchase: 50,
    });
  });

  it("handles Date objects and string dates for startsAt/endsAt", async () => {
    const admin = mockAdmin({
      discountCodeAppCreate: {
        codeAppDiscount: { discountId: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    const startsAtDate = new Date("2025-06-01T00:00:00.000Z");
    const endsAtDate = new Date("2025-12-31T00:00:00.000Z");

    await createShopifyDiscount(admin, "gid://fn/2", {
      ...coupon,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
    });

    const variables = admin.graphql.mock.calls[0][1]?.variables;
    expect(variables.codeAppDiscount.startsAt).toBe("2025-06-01T00:00:00.000Z");
    expect(variables.codeAppDiscount.endsAt).toBe("2025-12-31T00:00:00.000Z");
  });
});

describe("updateShopifyDiscount", () => {
  const coupon = {
    title: "Summer Sale Updated",
    code: "SUMMER2025",
    discountType: "percentage",
    discountValue: 20,
    minimumPurchase: null,
    usageLimit: null,
    startsAt: "2025-06-01T00:00:00.000Z",
    endsAt: null,
  };

  it("sends update mutation with shopifyDiscountId", async () => {
    const admin = mockAdmin({
      discountCodeAppUpdate: {
        codeAppDiscount: { discountId: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    const result = await updateShopifyDiscount(
      admin,
      "gid://shopify/DiscountCodeApp/123",
      coupon,
    );

    expect(result.id).toBe("gid://shopify/DiscountCodeApp/123");
    expect(result.userErrors).toEqual([]);

    const variables = admin.graphql.mock.calls[0][1]?.variables;
    expect(variables.id).toBe("gid://shopify/DiscountCodeApp/123");
  });

  it("does not include functionId in update", async () => {
    const admin = mockAdmin({
      discountCodeAppUpdate: {
        codeAppDiscount: { discountId: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    await updateShopifyDiscount(
      admin,
      "gid://shopify/DiscountCodeApp/123",
      coupon,
    );

    const variables = admin.graphql.mock.calls[0][1]?.variables;
    expect(variables.codeAppDiscount).not.toHaveProperty("functionId");
  });
});

describe("deleteShopifyDiscount", () => {
  it("returns deletedId on success", async () => {
    const admin = mockAdmin({
      discountCodeDelete: {
        deletedCodeDiscountId: "gid://shopify/DiscountCodeApp/123",
        userErrors: [],
      },
    });

    const result = await deleteShopifyDiscount(
      admin,
      "gid://shopify/DiscountCodeApp/123",
    );

    expect(result.deletedId).toBe("gid://shopify/DiscountCodeApp/123");
    expect(result.userErrors).toEqual([]);
  });
});

describe("activateShopifyDiscount", () => {
  it("sends activate mutation", async () => {
    const admin = mockAdmin({
      discountCodeActivate: {
        codeDiscountNode: { id: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    const result = await activateShopifyDiscount(
      admin,
      "gid://shopify/DiscountCodeApp/123",
    );

    expect(result.userErrors).toEqual([]);
    expect(admin.graphql).toHaveBeenCalledOnce();
    expect(admin.graphql.mock.calls[0][0]).toContain("discountCodeActivate");
  });
});

describe("deactivateShopifyDiscount", () => {
  it("sends deactivate mutation", async () => {
    const admin = mockAdmin({
      discountCodeDeactivate: {
        codeDiscountNode: { id: "gid://shopify/DiscountCodeApp/123" },
        userErrors: [],
      },
    });

    const result = await deactivateShopifyDiscount(
      admin,
      "gid://shopify/DiscountCodeApp/123",
    );

    expect(result.userErrors).toEqual([]);
    expect(admin.graphql).toHaveBeenCalledOnce();
    expect(admin.graphql.mock.calls[0][0]).toContain("discountCodeDeactivate");
  });
});
