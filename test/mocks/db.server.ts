import { vi } from "vitest";

const mockDb = {
  coupon: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
};

export default mockDb;
