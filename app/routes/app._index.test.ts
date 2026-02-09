import { describe, it, expect, vi, beforeEach } from "vitest";
import mockDb from "../../test/mocks/db.server";
import { authenticate as mockAuthenticate } from "../../test/mocks/shopify.server";

vi.mock("../db.server", () => ({ default: mockDb }));
vi.mock("../shopify.server", () => ({ authenticate: mockAuthenticate }));

const mockDeleteShopifyDiscount = vi.fn().mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });

vi.mock("../utils/shopify-discount.server", () => ({
  deleteShopifyDiscount: (...args: unknown[]) => mockDeleteShopifyDiscount(...args),
}));

const { loader, action } = await import("./app._index");

describe("app._index loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
  });

  it("calls authenticate.admin with the request", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app");
    await loader({ request, params: {}, context: {} });

    expect(mockAuthenticate.admin).toHaveBeenCalledWith(request);
  });

  it("returns coupons scoped to the authenticated shop", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app");
    await loader({ request, params: {}, context: {} });

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith({
      where: { shop: "test-shop.myshopify.com" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
    });
  });

  it("returns the coupons from the database in the response JSON", async () => {
    const fakeCoupons = [
      { id: 1, title: "Test Coupon", code: "TEST10" },
      { id: 2, title: "Another Coupon", code: "SAVE20" },
    ];
    mockDb.coupon.findMany.mockResolvedValue(fakeCoupons);
    mockDb.coupon.count.mockResolvedValue(2);

    const request = new Request("http://localhost/app");
    const response = await loader({ request, params: {}, context: {} });
    const data = await response.json();

    expect(data.coupons).toEqual(fakeCoupons);
    expect(data.totalCount).toBe(2);
    expect(data.page).toBe(1);
  });

  it("passes search param to query", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app?search=TEST");
    const response = await loader({ request, params: {}, context: {} });
    const data = await response.json();

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith({
      where: {
        AND: [
          { shop: "test-shop.myshopify.com" },
          { OR: [{ code: { contains: "TEST" } }, { title: { contains: "TEST" } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
    });
    expect(data.search).toBe("TEST");
  });

  it("passes status filter to query", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app?status=inactive");
    await loader({ request, params: {}, context: {} });

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { shop: "test-shop.myshopify.com" },
            { isActive: false },
          ],
        },
      }),
    );
  });

  it("passes discountType filter to query", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app?discountType=percentage");
    await loader({ request, params: {}, context: {} });

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { shop: "test-shop.myshopify.com" },
            { discountType: { in: ["percentage"] } },
          ],
        },
      }),
    );
  });

  it("passes sort param to query", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app?sort=code&direction=asc");
    await loader({ request, params: {}, context: {} });

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { code: "asc" },
      }),
    );
  });

  it("passes page param to query", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app?page=2");
    const response = await loader({ request, params: {}, context: {} });
    const data = await response.json();

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      }),
    );
    expect(data.page).toBe(2);
  });

  it("returns totalCount from count query", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(25);

    const request = new Request("http://localhost/app");
    const response = await loader({ request, params: {}, context: {} });
    const data = await response.json();

    expect(data.totalCount).toBe(25);
  });

  it("defaults invalid page to 1", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request("http://localhost/app?page=-1");
    await loader({ request, params: {}, context: {} });

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
      }),
    );
  });

  it("returns filter state in response", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);
    mockDb.coupon.count.mockResolvedValue(0);

    const request = new Request(
      "http://localhost/app?search=test&status=active&discountType=percentage&sort=code&direction=asc&page=2",
    );
    const response = await loader({ request, params: {}, context: {} });
    const data = await response.json();

    expect(data.search).toBe("test");
    expect(data.status).toEqual(["active"]);
    expect(data.discountType).toEqual(["percentage"]);
    expect(data.sort).toBe("code");
    expect(data.direction).toBe("asc");
    expect(data.page).toBe(2);
  });
});

describe("action - bulkDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
    mockDeleteShopifyDiscount.mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
  });

  it("deletes selected coupons scoped by shop", async () => {
    mockDb.coupon.findMany.mockResolvedValue([
      { shopifyDiscountId: "gid://shopify/DiscountCodeApp/1" },
      { shopifyDiscountId: null },
    ]);
    mockDb.coupon.deleteMany.mockResolvedValue({ count: 2 });

    const formData = new FormData();
    formData.set("_action", "bulkDelete");
    formData.append("ids", "1");
    formData.append("ids", "2");

    const request = new Request("http://localhost/app", {
      method: "POST",
      body: formData,
    });
    const response = await action({ request, params: {}, context: {} });
    const data = await response.json() as { deleted: number };

    expect(data.deleted).toBe(2);
    expect(mockDb.coupon.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: [1, 2] },
        shop: "test-shop.myshopify.com",
      },
    });
  });

  it("handles empty selection gracefully", async () => {
    const formData = new FormData();
    formData.set("_action", "bulkDelete");

    const request = new Request("http://localhost/app", {
      method: "POST",
      body: formData,
    });
    const response = await action({ request, params: {}, context: {} });
    const data = await response.json() as { deleted: number };

    expect(data.deleted).toBe(0);
    expect(mockDb.coupon.deleteMany).not.toHaveBeenCalled();
  });

  it("returns error for unknown action", async () => {
    const formData = new FormData();
    formData.set("_action", "unknown");

    const request = new Request("http://localhost/app", {
      method: "POST",
      body: formData,
    });
    const response = await action({ request, params: {}, context: {} });

    expect(response.status).toBe(400);
  });

  it("deletes Shopify discounts before bulk DB delete", async () => {
    mockDb.coupon.findMany.mockResolvedValue([
      { shopifyDiscountId: "gid://shopify/DiscountCodeApp/1" },
      { shopifyDiscountId: "gid://shopify/DiscountCodeApp/2" },
    ]);
    mockDb.coupon.deleteMany.mockResolvedValue({ count: 2 });

    const formData = new FormData();
    formData.set("_action", "bulkDelete");
    formData.append("ids", "1");
    formData.append("ids", "2");

    const request = new Request("http://localhost/app", {
      method: "POST",
      body: formData,
    });
    await action({ request, params: {}, context: {} });

    expect(mockDeleteShopifyDiscount).toHaveBeenCalledTimes(2);
    expect(mockDeleteShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/DiscountCodeApp/1",
    );
    expect(mockDeleteShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/DiscountCodeApp/2",
    );
  });

  it("skips Shopify delete for coupons without shopifyDiscountId", async () => {
    mockDb.coupon.findMany.mockResolvedValue([
      { shopifyDiscountId: null },
      { shopifyDiscountId: null },
    ]);
    mockDb.coupon.deleteMany.mockResolvedValue({ count: 2 });

    const formData = new FormData();
    formData.set("_action", "bulkDelete");
    formData.append("ids", "1");
    formData.append("ids", "2");

    const request = new Request("http://localhost/app", {
      method: "POST",
      body: formData,
    });
    await action({ request, params: {}, context: {} });

    expect(mockDeleteShopifyDiscount).not.toHaveBeenCalled();
  });
});
