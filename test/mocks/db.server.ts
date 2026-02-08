import { vi } from "vitest";

const mockDb = {
  coupon: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
};

export default mockDb;
