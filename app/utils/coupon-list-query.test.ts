import { describe, it, expect } from "vitest";
import {
  parseCouponListParams,
  buildStatusFilter,
  buildCouponListQuery,
  PAGE_SIZE,
} from "./coupon-list-query";

describe("parseCouponListParams", () => {
  it("returns defaults for empty URLSearchParams", () => {
    const result = parseCouponListParams(new URLSearchParams());
    expect(result).toEqual({
      search: "",
      status: [],
      discountType: [],
      sort: "createdAt",
      direction: "desc",
      page: 1,
      pageSize: PAGE_SIZE,
    });
  });

  it("parses valid search, status, discountType, sort, direction, page", () => {
    const params = new URLSearchParams([
      ["search", "SUMMER"],
      ["status", "active"],
      ["status", "expired"],
      ["discountType", "percentage"],
      ["sort", "code"],
      ["direction", "asc"],
      ["page", "3"],
    ]);
    const result = parseCouponListParams(params);
    expect(result).toEqual({
      search: "SUMMER",
      status: ["active", "expired"],
      discountType: ["percentage"],
      sort: "code",
      direction: "asc",
      page: 3,
      pageSize: PAGE_SIZE,
    });
  });

  it("ignores invalid status values", () => {
    const params = new URLSearchParams([
      ["status", "active"],
      ["status", "bogus"],
      ["status", "expired"],
    ]);
    const result = parseCouponListParams(params);
    expect(result.status).toEqual(["active", "expired"]);
  });

  it("ignores invalid sort values and falls back to createdAt", () => {
    const params = new URLSearchParams([["sort", "invalid"]]);
    const result = parseCouponListParams(params);
    expect(result.sort).toBe("createdAt");
  });

  it("clamps page to >= 1 for invalid values", () => {
    const zero = parseCouponListParams(new URLSearchParams([["page", "0"]]));
    expect(zero.page).toBe(1);

    const negative = parseCouponListParams(new URLSearchParams([["page", "-1"]]));
    expect(negative.page).toBe(1);

    const nan = parseCouponListParams(new URLSearchParams([["page", "abc"]]));
    expect(nan.page).toBe(1);
  });
});

describe("buildStatusFilter", () => {
  const now = new Date("2025-06-15T12:00:00Z");

  it("returns undefined for empty array", () => {
    expect(buildStatusFilter([], now)).toBeUndefined();
  });

  it("produces correct condition for 'active' status", () => {
    const result = buildStatusFilter(["active"], now);
    expect(result).toEqual({
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    });
  });

  it("produces correct condition for 'scheduled' status", () => {
    const result = buildStatusFilter(["scheduled"], now);
    expect(result).toEqual({
      isActive: true,
      startsAt: { gt: now },
    });
  });

  it("produces correct condition for 'expired' status", () => {
    const result = buildStatusFilter(["expired"], now);
    expect(result).toEqual({
      isActive: true,
      endsAt: { not: null, lt: now },
    });
  });

  it("produces correct condition for 'inactive' status", () => {
    const result = buildStatusFilter(["inactive"], now);
    expect(result).toEqual({ isActive: false });
  });

  it("wraps multiple statuses in OR", () => {
    const result = buildStatusFilter(["active", "inactive"], now);
    expect(result).toEqual({
      OR: [
        {
          isActive: true,
          startsAt: { lte: now },
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        { isActive: false },
      ],
    });
  });
});

describe("buildCouponListQuery", () => {
  const defaults = parseCouponListParams(new URLSearchParams());

  it("returns shop-only where with default ordering for no filters", () => {
    const result = buildCouponListQuery("test.myshopify.com", defaults);
    expect(result).toEqual({
      where: { shop: "test.myshopify.com" },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: PAGE_SIZE,
    });
  });

  it("includes code/title search conditions in where", () => {
    const params = parseCouponListParams(
      new URLSearchParams([["search", "SUMMER"]]),
    );
    const result = buildCouponListQuery("test.myshopify.com", params);
    expect(result.where).toEqual({
      AND: [
        { shop: "test.myshopify.com" },
        {
          OR: [
            { code: { contains: "SUMMER" } },
            { title: { contains: "SUMMER" } },
          ],
        },
      ],
    });
  });

  it("includes discountType filter in where", () => {
    const params = parseCouponListParams(
      new URLSearchParams([
        ["discountType", "percentage"],
        ["discountType", "fixed_amount"],
      ]),
    );
    const result = buildCouponListQuery("test.myshopify.com", params);
    expect(result.where).toEqual({
      AND: [
        { shop: "test.myshopify.com" },
        { discountType: { in: ["percentage", "fixed_amount"] } },
      ],
    });
  });

  it("calculates correct skip for page 2", () => {
    const params = parseCouponListParams(
      new URLSearchParams([["page", "2"]]),
    );
    const result = buildCouponListQuery("test.myshopify.com", params);
    expect(result.skip).toBe(PAGE_SIZE);
    expect(result.take).toBe(PAGE_SIZE);
  });
});
