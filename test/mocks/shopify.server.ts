import { vi } from "vitest";

export const authenticate = {
  admin: vi.fn().mockResolvedValue({
    session: { shop: "test-shop.myshopify.com" },
    admin: { graphql: vi.fn() },
  }),
};
