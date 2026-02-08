export interface CouponFormData {
  title: string;
  code: string;
  discountType: string;
  discountValue: string;
  minimumPurchase: string;
  usageLimit: string;
  startsAt: string;
  endsAt: string;
}

export interface ValidationErrors {
  title?: string;
  code?: string;
  discountType?: string;
  discountValue?: string;
  minimumPurchase?: string;
  usageLimit?: string;
  startsAt?: string;
  endsAt?: string;
}

export interface ValidatedCouponData {
  title: string;
  code: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  minimumPurchase: number | null;
  usageLimit: number | null;
  startsAt: Date;
  endsAt: Date | null;
}

export type ValidationResult =
  | { success: true; data: ValidatedCouponData }
  | { success: false; errors: ValidationErrors };

export function validateCouponForm(raw: CouponFormData): ValidationResult {
  const errors: ValidationErrors = {};

  // Title validation
  const title = raw.title.trim();
  if (!title) {
    errors.title = "Title is required";
  } else if (title.length > 255) {
    errors.title = "Title must be 255 characters or less";
  }

  // Code validation - uppercase, alphanumeric + hyphens
  const code = raw.code.trim().toUpperCase();
  if (!code) {
    errors.code = "Code is required";
  } else if (!/^[A-Z0-9-]+$/.test(code)) {
    errors.code = "Code can only contain letters, numbers, and hyphens";
  } else if (code.length < 3 || code.length > 50) {
    errors.code = "Code must be between 3 and 50 characters";
  }

  // Discount type validation
  if (raw.discountType !== "percentage" && raw.discountType !== "fixed_amount") {
    errors.discountType = "Discount type must be percentage or fixed amount";
  }

  // Discount value validation
  const discountValue = parseFloat(raw.discountValue);
  if (isNaN(discountValue) || discountValue <= 0) {
    errors.discountValue = "Discount value must be a positive number";
  } else if (raw.discountType === "percentage" && discountValue > 100) {
    errors.discountValue = "Percentage discount cannot exceed 100";
  }

  // Minimum purchase validation (optional)
  let minimumPurchase: number | null = null;
  if (raw.minimumPurchase.trim()) {
    minimumPurchase = parseFloat(raw.minimumPurchase);
    if (isNaN(minimumPurchase) || minimumPurchase < 0) {
      errors.minimumPurchase = "Minimum purchase must be a non-negative number";
    }
  }

  // Usage limit validation (optional)
  let usageLimit: number | null = null;
  if (raw.usageLimit.trim()) {
    usageLimit = parseInt(raw.usageLimit, 10);
    if (isNaN(usageLimit) || usageLimit <= 0 || !Number.isInteger(parseFloat(raw.usageLimit))) {
      errors.usageLimit = "Usage limit must be a positive whole number";
    }
  }

  // Start date validation
  const startsAt = new Date(raw.startsAt);
  if (!raw.startsAt.trim() || isNaN(startsAt.getTime())) {
    errors.startsAt = "Start date is required";
  }

  // End date validation (optional)
  let endsAt: Date | null = null;
  if (raw.endsAt.trim()) {
    endsAt = new Date(raw.endsAt);
    if (isNaN(endsAt.getTime())) {
      errors.endsAt = "End date must be a valid date";
    } else if (!errors.startsAt && endsAt <= startsAt) {
      errors.endsAt = "End date must be after start date";
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      title,
      code,
      discountType: raw.discountType as "percentage" | "fixed_amount",
      discountValue,
      minimumPurchase,
      usageLimit,
      startsAt,
      endsAt,
    },
  };
}
