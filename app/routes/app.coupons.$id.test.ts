import { describe, it, expect, vi, beforeEach } from "vitest";
import mockDb from "../../test/mocks/db.server";
import { authenticate as mockAuthenticate } from "../../test/mocks/shopify.server";

vi.mock("../db.server", () => ({ default: mockDb }));
vi.mock("../shopify.server", () => ({ authenticate: mockAuthenticate }));

const mockUpdateShopifyDiscount = vi.fn().mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
const mockDeleteShopifyDiscount = vi.fn().mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
const mockActivateShopifyDiscount = vi.fn().mockResolvedValue({ userErrors: [] });
const mockDeactivateShopifyDiscount = vi.fn().mockResolvedValue({ userErrors: [] });

vi.mock("../utils/shopify-discount.server", () => ({
  updateShopifyDiscount: (...args: unknown[]) => mockUpdateShopifyDiscount(...args),
  deleteShopifyDiscount: (...args: unknown[]) => mockDeleteShopifyDiscount(...args),
  activateShopifyDiscount: (...args: unknown[]) => mockActivateShopifyDiscount(...args),
  deactivateShopifyDiscount: (...args: unknown[]) => mockDeactivateShopifyDiscount(...args),
}));

const { loader, action } = await import("./app.coupons.$id");

function buildFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}

const existingCoupon = {
  id: 1,
  shop: "test-shop.myshopify.com",
  title: "Test",
  code: "TEST10",
  discountType: "percentage",
  discountValue: 10,
  minimumPurchase: null,
  usageLimit: null,
  usageCount: 0,
  isActive: true,
  shopifyDiscountId: "gid://shopify/DiscountCodeApp/1",
  startsAt: "2025-01-01T00:00:00.000Z",
  endsAt: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const validFormData: Record<string, string> = {
  _action: "update",
  title: "Updated Coupon",
  code: "UPDATED10",
  discountType: "percentage",
  discountValue: "10",
  minimumPurchase: "",
  usageLimit: "",
  startsAt: "2025-01-01",
  endsAt: "",
};

describe("loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
    mockUpdateShopifyDiscount.mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockDeleteShopifyDiscount.mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockActivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
    mockDeactivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
  });

  it("returns coupon data for valid id and shop", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);

    const response = await loader({
      request: new Request("http://localhost/app/coupons/1"),
      params: { id: "1" },
      context: {},
    });

    const data = await response.json();
    expect(data.coupon).toEqual(existingCoupon);
  });

  it("returns 404 for non-existent coupon", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(null);

    try {
      await loader({
        request: new Request("http://localhost/app/coupons/999"),
        params: { id: "999" },
        context: {},
      });
      expect.fail("Expected a 404 Response to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("returns 404 for non-numeric id", async () => {
    try {
      await loader({
        request: new Request("http://localhost/app/coupons/abc"),
        params: { id: "abc" },
        context: {},
      });
      expect.fail("Expected a 404 Response to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("scopes query by shop", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);

    await loader({
      request: new Request("http://localhost/app/coupons/1"),
      params: { id: "1" },
      context: {},
    });

    expect(mockDb.coupon.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shop: "test-shop.myshopify.com",
        }),
      }),
    );
  });
});

describe("action - update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
    mockUpdateShopifyDiscount.mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockDeleteShopifyDiscount.mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockActivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
    mockDeactivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
  });

  it("updates coupon with valid data and redirects", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    mockDb.coupon.update.mockResolvedValue({ id: 1 });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData(validFormData),
    });
    const response = await action({
      request,
      params: { id: "1" },
      context: {},
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("/app?updated=1");
  });

  it("returns 422 for invalid data", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({
        ...validFormData,
        title: "",
        code: "",
      }),
    });
    const response = await action({
      request,
      params: { id: "1" },
      context: {},
    });

    expect(response.status).toBe(422);
    const data = await response.json() as { errors: Record<string, string> };
    expect(data.errors.title).toBeDefined();
    expect(data.errors.code).toBeDefined();
  });

  it("handles P2002 unique constraint on code", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    const prismaError = Object.assign(new Error("Unique constraint"), {
      code: "P2002",
    });
    mockDb.coupon.update.mockRejectedValueOnce(prismaError);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData(validFormData),
    });
    const response = await action({
      request,
      params: { id: "1" },
      context: {},
    });
    const data = await response.json() as { errors: Record<string, string> };

    expect(response.status).toBe(422);
    expect(data.errors.code).toContain("already exists");
  });

  it("returns 404 for non-existent coupon", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData(validFormData),
    });

    try {
      await action({ request, params: { id: "1" }, context: {} });
      expect.fail("Expected a 404 Response to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("calls updateShopifyDiscount when shopifyDiscountId exists", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    mockDb.coupon.update.mockResolvedValue({ id: 1 });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData(validFormData),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockUpdateShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/DiscountCodeApp/1",
      expect.objectContaining({
        title: "Updated Coupon",
        code: "UPDATED10",
      }),
    );
  });

  it("skips Shopify update when shopifyDiscountId is null", async () => {
    mockDb.coupon.findFirst.mockResolvedValue({ ...existingCoupon, shopifyDiscountId: null });
    mockDb.coupon.update.mockResolvedValue({ id: 1 });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData(validFormData),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockUpdateShopifyDiscount).not.toHaveBeenCalled();
  });
});

describe("action - delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
    mockUpdateShopifyDiscount.mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockDeleteShopifyDiscount.mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockActivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
    mockDeactivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
  });

  it("deletes coupon and redirects", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    mockDb.coupon.delete.mockResolvedValue(existingCoupon);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "delete" }),
    });
    const response = await action({
      request,
      params: { id: "1" },
      context: {},
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("/app?deleted=1");
  });

  it("returns 404 for non-existent coupon", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "delete" }),
    });

    try {
      await action({ request, params: { id: "1" }, context: {} });
      expect.fail("Expected a 404 Response to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("scopes delete check by shop", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    mockDb.coupon.delete.mockResolvedValue(existingCoupon);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "delete" }),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockDb.coupon.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          shop: "test-shop.myshopify.com",
        }),
      }),
    );
  });

  it("calls deleteShopifyDiscount before DB delete", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    mockDb.coupon.delete.mockResolvedValue(existingCoupon);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "delete" }),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockDeleteShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/DiscountCodeApp/1",
    );
  });
});

describe("action - toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticate.admin.mockResolvedValue({
      session: { shop: "test-shop.myshopify.com" },
      admin: { graphql: vi.fn() },
    });
    mockUpdateShopifyDiscount.mockResolvedValue({ id: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockDeleteShopifyDiscount.mockResolvedValue({ deletedId: "gid://shopify/DiscountCodeApp/1", userErrors: [] });
    mockActivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
    mockDeactivateShopifyDiscount.mockResolvedValue({ userErrors: [] });
  });

  it("toggles isActive from true to false", async () => {
    mockDb.coupon.findFirst.mockResolvedValue({
      ...existingCoupon,
      isActive: true,
    });
    mockDb.coupon.update.mockResolvedValue({ ...existingCoupon, isActive: false });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "toggle" }),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockDb.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: false },
      }),
    );
  });

  it("toggles isActive from false to true", async () => {
    mockDb.coupon.findFirst.mockResolvedValue({
      ...existingCoupon,
      isActive: false,
    });
    mockDb.coupon.update.mockResolvedValue({ ...existingCoupon, isActive: true });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "toggle" }),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockDb.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { isActive: true },
      }),
    );
  });

  it("returns JSON response (no redirect)", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(existingCoupon);
    mockDb.coupon.update.mockResolvedValue({ ...existingCoupon, isActive: false });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "toggle" }),
    });
    const response = await action({
      request,
      params: { id: "1" },
      context: {},
    });

    const data = await response.json() as { success: boolean };
    expect(data.success).toBe(true);
  });

  it("returns 404 for non-existent coupon", async () => {
    mockDb.coupon.findFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "toggle" }),
    });

    try {
      await action({ request, params: { id: "1" }, context: {} });
      expect.fail("Expected a 404 Response to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });

  it("calls deactivateShopifyDiscount when toggling active to inactive", async () => {
    mockDb.coupon.findFirst.mockResolvedValue({ ...existingCoupon, isActive: true });
    mockDb.coupon.update.mockResolvedValue({ ...existingCoupon, isActive: false });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "toggle" }),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockDeactivateShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/DiscountCodeApp/1",
    );
  });

  it("calls activateShopifyDiscount when toggling inactive to active", async () => {
    mockDb.coupon.findFirst.mockResolvedValue({ ...existingCoupon, isActive: false });
    mockDb.coupon.update.mockResolvedValue({ ...existingCoupon, isActive: true });

    const request = new Request("http://localhost/app/coupons/1", {
      method: "POST",
      body: buildFormData({ _action: "toggle" }),
    });
    await action({ request, params: { id: "1" }, context: {} });

    expect(mockActivateShopifyDiscount).toHaveBeenCalledWith(
      expect.anything(),
      "gid://shopify/DiscountCodeApp/1",
    );
  });
});
