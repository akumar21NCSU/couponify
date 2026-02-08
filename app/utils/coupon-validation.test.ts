import { describe, it, expect } from "vitest";
import { validateCouponForm } from "./coupon-validation";

const validData = {
  title: "Summer Sale",
  code: "SUMMER2025",
  discountType: "percentage",
  discountValue: "15",
  minimumPurchase: "",
  usageLimit: "",
  startsAt: "2025-06-01",
  endsAt: "",
};

describe("validateCouponForm", () => {
  it("accepts valid complete data", () => {
    const result = validateCouponForm({
      ...validData,
      minimumPurchase: "50",
      usageLimit: "100",
      endsAt: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("returns parsed data with correct types", () => {
    const result = validateCouponForm({
      ...validData,
      minimumPurchase: "50",
      usageLimit: "100",
      endsAt: "2025-12-31",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(typeof result.data.discountValue).toBe("number");
    expect(result.data.discountValue).toBe(15);
    expect(typeof result.data.minimumPurchase).toBe("number");
    expect(result.data.minimumPurchase).toBe(50);
    expect(typeof result.data.usageLimit).toBe("number");
    expect(result.data.usageLimit).toBe(100);
    expect(result.data.startsAt).toBeInstanceOf(Date);
    expect(result.data.endsAt).toBeInstanceOf(Date);
  });

  it("rejects empty title", () => {
    const result = validateCouponForm({ ...validData, title: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.title).toBeDefined();
  });

  it("rejects empty code", () => {
    const result = validateCouponForm({ ...validData, code: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.code).toBeDefined();
  });

  it("rejects code with spaces or special characters", () => {
    const resultSpaces = validateCouponForm({ ...validData, code: "SUMMER 2025" });
    expect(resultSpaces.success).toBe(false);
    if (!resultSpaces.success) {
      expect(resultSpaces.errors.code).toBeDefined();
    }

    const resultSpecial = validateCouponForm({ ...validData, code: "SUMMER@2025" });
    expect(resultSpecial.success).toBe(false);
    if (!resultSpecial.success) {
      expect(resultSpecial.errors.code).toBeDefined();
    }
  });

  it("auto-uppercases the code", () => {
    const result = validateCouponForm({ ...validData, code: "summer2025" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.code).toBe("SUMMER2025");
  });

  it("rejects invalid discountType", () => {
    const result = validateCouponForm({ ...validData, discountType: "invalid" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.discountType).toBeDefined();
  });

  it("rejects negative discountValue", () => {
    const result = validateCouponForm({ ...validData, discountValue: "-5" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.discountValue).toBeDefined();
  });

  it("rejects zero discountValue", () => {
    const result = validateCouponForm({ ...validData, discountValue: "0" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.discountValue).toBeDefined();
  });

  it("rejects percentage value over 100", () => {
    const result = validateCouponForm({
      ...validData,
      discountType: "percentage",
      discountValue: "101",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.discountValue).toBeDefined();
  });

  it("allows fixed_amount value over 100", () => {
    const result = validateCouponForm({
      ...validData,
      discountType: "fixed_amount",
      discountValue: "200",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative minimumPurchase", () => {
    const result = validateCouponForm({ ...validData, minimumPurchase: "-10" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.minimumPurchase).toBeDefined();
  });

  it("allows empty minimumPurchase and returns null", () => {
    const result = validateCouponForm({ ...validData, minimumPurchase: "" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.minimumPurchase).toBeNull();
  });

  it("rejects non-positive usageLimit", () => {
    const result = validateCouponForm({ ...validData, usageLimit: "0" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.usageLimit).toBeDefined();
  });

  it("allows empty usageLimit and returns null", () => {
    const result = validateCouponForm({ ...validData, usageLimit: "" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.usageLimit).toBeNull();
  });

  it("rejects missing startsAt", () => {
    const result = validateCouponForm({ ...validData, startsAt: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.startsAt).toBeDefined();
  });

  it("rejects endsAt before startsAt", () => {
    const result = validateCouponForm({
      ...validData,
      startsAt: "2025-06-01",
      endsAt: "2025-05-01",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.endsAt).toBeDefined();
  });

  it("returns multiple errors when multiple fields are invalid", () => {
    const result = validateCouponForm({
      title: "",
      code: "",
      discountType: "invalid",
      discountValue: "-5",
      minimumPurchase: "-10",
      usageLimit: "0",
      startsAt: "",
      endsAt: "",
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errorCount = Object.keys(result.errors).length;
    expect(errorCount).toBeGreaterThanOrEqual(5);
  });
});
