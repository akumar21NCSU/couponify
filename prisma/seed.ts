import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = "abhi-test-store-1.myshopify.com";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

const coupons = [
  // ── Active coupons (isActive=true, started, not expired) ──
  {
    title: "Summer Sale",
    code: "SUMMER25",
    discountType: "percentage",
    discountValue: 25,
    minimumPurchase: 50,
    usageLimit: 100,
    usageCount: 42,
    startsAt: daysAgo(30),
    endsAt: daysFromNow(30),
    isActive: true,
  },
  {
    title: "Welcome Discount",
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minimumPurchase: null,
    usageLimit: null,
    usageCount: 187,
    startsAt: daysAgo(90),
    endsAt: null,
    isActive: true,
  },
  {
    title: "Free Shipping Over $75",
    code: "FREESHIP75",
    discountType: "fixed_amount",
    discountValue: 8.99,
    minimumPurchase: 75,
    usageLimit: 500,
    usageCount: 312,
    startsAt: daysAgo(60),
    endsAt: null,
    isActive: true,
  },
  {
    title: "Flash Deal",
    code: "FLASH15",
    discountType: "percentage",
    discountValue: 15,
    minimumPurchase: 30,
    usageLimit: 50,
    usageCount: 8,
    startsAt: daysAgo(2),
    endsAt: daysFromNow(5),
    isActive: true,
  },
  {
    title: "Loyalty Reward",
    code: "LOYAL20",
    discountType: "percentage",
    discountValue: 20,
    minimumPurchase: null,
    usageLimit: 200,
    usageCount: 73,
    startsAt: daysAgo(14),
    endsAt: daysFromNow(60),
    isActive: true,
  },
  {
    title: "Flat $5 Off",
    code: "FLAT5",
    discountType: "fixed_amount",
    discountValue: 5,
    minimumPurchase: 25,
    usageLimit: null,
    usageCount: 401,
    startsAt: daysAgo(120),
    endsAt: null,
    isActive: true,
  },

  // ── Scheduled coupons (isActive=true, starts in future) ──
  {
    title: "Holiday Special",
    code: "HOLIDAY30",
    discountType: "percentage",
    discountValue: 30,
    minimumPurchase: 100,
    usageLimit: 1000,
    usageCount: 0,
    startsAt: daysFromNow(15),
    endsAt: daysFromNow(45),
    isActive: true,
  },
  {
    title: "Spring Launch",
    code: "SPRING2026",
    discountType: "fixed_amount",
    discountValue: 12,
    minimumPurchase: 60,
    usageLimit: 300,
    usageCount: 0,
    startsAt: daysFromNow(30),
    endsAt: daysFromNow(90),
    isActive: true,
  },
  {
    title: "VIP Early Access",
    code: "VIPEARLY",
    discountType: "percentage",
    discountValue: 40,
    minimumPurchase: null,
    usageLimit: 50,
    usageCount: 0,
    startsAt: daysFromNow(7),
    endsAt: daysFromNow(14),
    isActive: true,
  },

  // ── Expired coupons (isActive=true, endsAt in past) ──
  {
    title: "Black Friday",
    code: "BFRIDAY50",
    discountType: "percentage",
    discountValue: 50,
    minimumPurchase: 200,
    usageLimit: 500,
    usageCount: 498,
    startsAt: daysAgo(75),
    endsAt: daysAgo(70),
    isActive: true,
  },
  {
    title: "New Year Blowout",
    code: "NEWYEAR20",
    discountType: "fixed_amount",
    discountValue: 20,
    minimumPurchase: 80,
    usageLimit: 100,
    usageCount: 67,
    startsAt: daysAgo(40),
    endsAt: daysAgo(10),
    isActive: true,
  },
  {
    title: "Valentines Deal",
    code: "LOVE15",
    discountType: "percentage",
    discountValue: 15,
    minimumPurchase: null,
    usageLimit: 250,
    usageCount: 250,
    startsAt: daysAgo(50),
    endsAt: daysAgo(20),
    isActive: true,
  },

  // ── Inactive coupons (isActive=false) ──
  {
    title: "Old Promo (Disabled)",
    code: "OLDPROMO",
    discountType: "percentage",
    discountValue: 5,
    minimumPurchase: null,
    usageLimit: null,
    usageCount: 22,
    startsAt: daysAgo(180),
    endsAt: null,
    isActive: false,
  },
  {
    title: "Paused Campaign",
    code: "PAUSED10",
    discountType: "fixed_amount",
    discountValue: 10,
    minimumPurchase: 40,
    usageLimit: 100,
    usageCount: 55,
    startsAt: daysAgo(30),
    endsAt: daysFromNow(30),
    isActive: false,
  },
  {
    title: "Retired Clearance",
    code: "CLEARANCE",
    discountType: "percentage",
    discountValue: 35,
    minimumPurchase: null,
    usageLimit: 75,
    usageCount: 75,
    startsAt: daysAgo(200),
    endsAt: daysAgo(100),
    isActive: false,
  },

  // ── Extra coupons to push past page 1 (10 per page) ──
  {
    title: "Bulk Test A",
    code: "BULKA",
    discountType: "percentage",
    discountValue: 8,
    minimumPurchase: null,
    usageLimit: null,
    usageCount: 0,
    startsAt: daysAgo(5),
    endsAt: null,
    isActive: true,
  },
  {
    title: "Bulk Test B",
    code: "BULKB",
    discountType: "fixed_amount",
    discountValue: 3,
    minimumPurchase: 15,
    usageLimit: null,
    usageCount: 14,
    startsAt: daysAgo(10),
    endsAt: null,
    isActive: true,
  },
  {
    title: "Bulk Test C",
    code: "BULKC",
    discountType: "percentage",
    discountValue: 12,
    minimumPurchase: null,
    usageLimit: 1000,
    usageCount: 999,
    startsAt: daysAgo(3),
    endsAt: daysFromNow(100),
    isActive: true,
  },
  {
    title: "Bulk Test D",
    code: "BULKD",
    discountType: "fixed_amount",
    discountValue: 50,
    minimumPurchase: 250,
    usageLimit: 10,
    usageCount: 3,
    startsAt: daysAgo(1),
    endsAt: daysFromNow(7),
    isActive: true,
  },
];

async function main() {
  // Clear existing coupons for this shop
  const deleted = await prisma.coupon.deleteMany({ where: { shop: SHOP } });
  console.log(`Cleared ${deleted.count} existing coupons for ${SHOP}`);

  for (const coupon of coupons) {
    await prisma.coupon.create({
      data: { shop: SHOP, ...coupon },
    });
  }

  console.log(`Seeded ${coupons.length} coupons for ${SHOP}`);
  console.log("");
  console.log("Breakdown:");
  console.log("  Active:    6  (SUMMER25, WELCOME10, FREESHIP75, FLASH15, LOYAL20, FLAT5)");
  console.log("  Scheduled: 3  (HOLIDAY30, SPRING2026, VIPEARLY)");
  console.log("  Expired:   3  (BFRIDAY50, NEWYEAR20, LOVE15)");
  console.log("  Inactive:  3  (OLDPROMO, PAUSED10, CLEARANCE)");
  console.log("  Extra:     4  (BULKA, BULKB, BULKC, BULKD)");
  console.log(`  Total:     ${coupons.length} (spans 2 pages at 10/page)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
