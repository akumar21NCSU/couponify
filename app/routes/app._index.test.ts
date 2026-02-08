import { describe, it, expect, vi, beforeEach } from "vitest";
import mockDb from "../../test/mocks/db.server";
import { authenticate as mockAuthenticate } from "../../test/mocks/shopify.server";

vi.mock("../db.server", () => ({ default: mockDb }));
vi.mock("../shopify.server", () => ({ authenticate: mockAuthenticate }));

const { loader } = await import("./app._index");

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

    const request = new Request("http://localhost/app");
    await loader({ request, params: {}, context: {} });

    expect(mockAuthenticate.admin).toHaveBeenCalledWith(request);
  });

  it("returns coupons scoped to the authenticated shop", async () => {
    mockDb.coupon.findMany.mockResolvedValue([]);

    const request = new Request("http://localhost/app");
    await loader({ request, params: {}, context: {} });

    expect(mockDb.coupon.findMany).toHaveBeenCalledWith({
      where: { shop: "test-shop.myshopify.com" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("returns the coupons from the database in the response JSON", async () => {
    const fakeCoupons = [
      { id: 1, title: "Test Coupon", code: "TEST10" },
      { id: 2, title: "Another Coupon", code: "SAVE20" },
    ];
    mockDb.coupon.findMany.mockResolvedValue(fakeCoupons);

    const request = new Request("http://localhost/app");
    const response = await loader({ request, params: {}, context: {} });
    const data = await response.json();

    expect(data.coupons).toEqual(fakeCoupons);
  });
});
