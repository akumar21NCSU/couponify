import { describe, it, expect, vi } from "vitest";
import { formatDiscount, getCouponStatus } from "./format-discount";

describe("formatDiscount", () => {
  it("returns percentage format for percentage type", () => {
    expect(formatDiscount("percentage", 15)).toBe("15%");
  });

  it("returns dollar format for fixed_amount type", () => {
    expect(formatDiscount("fixed_amount", 10)).toBe("$10.00");
  });

  it("returns dollar format with decimals for fixed_amount", () => {
    expect(formatDiscount("fixed_amount", 5.5)).toBe("$5.50");
  });
});

describe("getCouponStatus", () => {
  it("returns 'inactive' when isActive is false", () => {
    expect(getCouponStatus(false, "2020-01-01", null)).toBe("inactive");
  });

  it("returns 'scheduled' when start date is in the future", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(getCouponStatus(true, futureDate.toISOString(), null)).toBe("scheduled");
  });

  it("returns 'expired' when end date is in the past", () => {
    const pastStart = "2020-01-01";
    const pastEnd = "2020-12-31";
    expect(getCouponStatus(true, pastStart, pastEnd)).toBe("expired");
  });

  it("returns 'active' for currently valid coupon", () => {
    const pastStart = "2020-01-01";
    const futureEnd = new Date();
    futureEnd.setFullYear(futureEnd.getFullYear() + 1);
    expect(getCouponStatus(true, pastStart, futureEnd.toISOString())).toBe("active");
  });

  it("returns 'active' when endsAt is null and currently started", () => {
    const pastStart = "2020-01-01";
    expect(getCouponStatus(true, pastStart, null)).toBe("active");
  });
});
