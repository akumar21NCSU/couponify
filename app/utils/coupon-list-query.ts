export const PAGE_SIZE = 10;

const VALID_STATUSES = ["active", "scheduled", "expired", "inactive"] as const;
const VALID_DISCOUNT_TYPES = ["percentage", "fixed_amount"] as const;
const VALID_SORT_FIELDS = ["code", "createdAt", "discountValue"] as const;
const VALID_DIRECTIONS = ["asc", "desc"] as const;

export interface CouponListParams {
  search: string;
  status: string[];
  discountType: string[];
  sort: string;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
}

export function parseCouponListParams(
  searchParams: URLSearchParams,
): CouponListParams {
  const search = searchParams.get("search") ?? "";

  const status = searchParams
    .getAll("status")
    .filter((s): s is string =>
      (VALID_STATUSES as readonly string[]).includes(s),
    );

  const discountType = searchParams
    .getAll("discountType")
    .filter((d): d is string =>
      (VALID_DISCOUNT_TYPES as readonly string[]).includes(d),
    );

  const rawSort = searchParams.get("sort");
  const sort = rawSort &&
    (VALID_SORT_FIELDS as readonly string[]).includes(rawSort)
    ? rawSort
    : "createdAt";

  const rawDirection = searchParams.get("direction");
  const direction = rawDirection &&
    (VALID_DIRECTIONS as readonly string[]).includes(rawDirection)
    ? (rawDirection as "asc" | "desc")
    : "desc";

  const rawPage = parseInt(searchParams.get("page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  return { search, status, discountType, sort, direction, page, pageSize: PAGE_SIZE };
}

interface PrismaWhereCondition {
  [key: string]: unknown;
}

function buildSingleStatusCondition(
  status: string,
  now: Date,
): PrismaWhereCondition | undefined {
  switch (status) {
    case "active":
      return {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      };
    case "scheduled":
      return {
        isActive: true,
        startsAt: { gt: now },
      };
    case "expired":
      return {
        isActive: true,
        endsAt: { not: null, lt: now },
      };
    case "inactive":
      return { isActive: false };
    default:
      return undefined;
  }
}

export function buildStatusFilter(
  statuses: string[],
  now?: Date,
): PrismaWhereCondition | undefined {
  const resolvedNow = now ?? new Date();

  const conditions = statuses
    .map((s) => buildSingleStatusCondition(s, resolvedNow))
    .filter((c): c is PrismaWhereCondition => c !== undefined);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { OR: conditions };
}

interface CouponListQuery {
  where: PrismaWhereCondition;
  orderBy: PrismaWhereCondition;
  skip: number;
  take: number;
}

export function buildCouponListQuery(
  shop: string,
  params: CouponListParams,
): CouponListQuery {
  const conditions: PrismaWhereCondition[] = [{ shop }];

  if (params.search) {
    conditions.push({
      OR: [
        { code: { contains: params.search } },
        { title: { contains: params.search } },
      ],
    });
  }

  if (params.status.length > 0) {
    const statusFilter = buildStatusFilter(params.status);
    if (statusFilter) {
      conditions.push(statusFilter);
    }
  }

  if (params.discountType.length > 0) {
    conditions.push({ discountType: { in: params.discountType } });
  }

  const where =
    conditions.length === 1 ? conditions[0] : { AND: conditions };

  const orderBy = { [params.sort]: params.direction };
  const skip = (params.page - 1) * params.pageSize;
  const take = params.pageSize;

  return { where, orderBy, skip, take };
}
