import { describe, it, expect, vi, beforeEach } from "vitest";
import mockDb from "../../test/mocks/db.server";
import { authenticate as mockAuthenticate } from "../../test/mocks/shopify.server";

vi.mock("../db.server", () => ({ default: mockDb }));
vi.mock("../shopify.server", () => ({ authenticate: mockAuthenticate }));

const mockGetFunctionId = vi.fn().mockResolvedValue("gid://shopify/ShopifyFunction/1");
const mockCreateShopifyDiscount = vi.fn().mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });

vi.mock("../utils/shopify-discount.server", () => ({
  getFunctionId: (...args: unknown[]) => mockGetFunctionId(...args),
  createShopifyDiscount: (...args: unknown[]) => mockCreateShopifyDiscount(...args),
}));

const { action } = await import("./app.coupons.new");

function buildFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

const validFormFields = {
  title: "Test Coupon",
  code: "TEST10",
  discountType: "percentage",
  discountValue: "10",
  minimumPurchase: "",
  usageLimit: "",
  startsAt: "2025-06-01",
  endsAt: "",
};

describe("app.coupons.new action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
    mockGetFunctionId.mockResolvedValue("gid://shopify/ShopifyFunction/1");
    mockCreateShopifyDiscount.mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
  });

  it("creates a coupon with valid data and redirects", async () => {
    mockDb.coupon.create.mockResolvedValue({ id: 1 });
    mockDb.coupon.update.mockResolvedValue({ id: 1 });

    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData(validFormFields),
    });
    const response = await action({ request, params: {}, context: {} });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("/app");
  });

  it("returns 422 with validation errors for invalid data", async () => {
    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData({ ...validFormFields, title: "" }),
    });
    const response = await action({ request, params: {}, context: {} });

    expect(response.status).toBe(422);
    const data = await response.json() as { errors: Record<string, string> };
    expect(data.errors.title).toBeDefined();
  });

  it("handles Prisma P2002 unique constraint error", async () => {
    const prismaError = new Error("Unique constraint failed");
    (prismaError as Error & { code: string }).code = "P2002";
    mockDb.coupon.create.mockRejectedValueOnce(prismaError);

    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData(validFormFields),
    });
    const response = await action({ request, params: {}, context: {} });
    const data = await response.json();

    expect(data.errors.code).toBeDefined();
  });

  it("scopes the coupon to the authenticated shop", async () => {
    mockDb.coupon.create.mockResolvedValue({ id: 1 });
    mockDb.coupon.update.mockResolvedValue({ id: 1 });

    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData(validFormFields),
    });
    await action({ request, params: {}, context: {} });

    expect(mockDb.coupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          shop: "test-shop.myshopify.com",
        }),
      }),
    );
  });

  it("calls createShopifyDiscount after DB create", async () => {
    mockDb.coupon.create.mockResolvedValue({ id: 1 });
    mockDb.coupon.update.mockResolvedValue({ id: 1 });

    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData(validFormFields),
    });
    await action({ request, params: {}, context: {} });

    expect(mockCreateShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/ShopifyFunction/1",
      expect.objectContaining({
        title: "Test Coupon",
        code: "TEST10",
        discountType: "percentage",
        discountValue: 10,
      }),
    );
  });

  it("updates local record with shopifyDiscountId on success", async () => {
    mockDb.coupon.create.mockResolvedValue({ id: 42 });
    mockDb.coupon.update.mockResolvedValue({ id: 42 });

    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData(validFormFields),
    });
    await action({ request, params: {}, context: {} });

    expect(mockDb.coupon.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { shopifyDiscountId: "gid://shopify/DiscountCodeApp/1" },
    });
  });

  it("still creates local coupon if Shopify sync fails", async () => {
    mockDb.coupon.create.mockResolvedValue({ id: 1 });
    mockGetFunctionId.mockRejectedValue(new Error("Extension not deployed"));

    const request = new Request("http://localhost/app/coupons/new", {
      method: "POST",
      body: buildFormData(validFormFields),
    });
    const response = await action({ request, params: {}, context: {} });

    expect(response.status).toBe(302);
    expect(mockDb.coupon.create).toHaveBeenCalled();
  });
});
