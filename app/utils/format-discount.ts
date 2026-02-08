export function formatDiscount(type: string, value: number): string {
  if (type === "percentage") {
    return `${value}%`;
  }
  return `$${value.toFixed(2)}`;
}

export function getCouponStatus(
  isActive: boolean,
  startsAt: string,
  endsAt: string | null,
): "active" | "scheduled" | "expired" | "inactive" {
  if (!isActive) return "inactive";
  const now = new Date();
  const start = new Date(startsAt);
  if (now < start) return "scheduled";
  if (endsAt && now > new Date(endsAt)) return "expired";
  return "active";
}
