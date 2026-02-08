import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useActionData, useNavigation } from "@remix-run/react";
import { Page, Layout } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { validateCouponForm } from "../utils/coupon-validation";
import type { CouponFormData, ValidationErrors } from "../utils/coupon-validation";
import { CouponForm } from "../components/CouponForm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const formData = await request.formData();
  const raw: CouponFormData = {
    title: formData.get("title") as string ?? "",
    code: formData.get("code") as string ?? "",
    discountType: formData.get("discountType") as string ?? "",
    discountValue: formData.get("discountValue") as string ?? "",
    minimumPurchase: formData.get("minimumPurchase") as string ?? "",
    usageLimit: formData.get("usageLimit") as string ?? "",
    startsAt: formData.get("startsAt") as string ?? "",
    endsAt: formData.get("endsAt") as string ?? "",
  };

  const result = validateCouponForm(raw);

  if (!result.success) {
    return json({ errors: result.errors }, { status: 422 });
  }

  try {
    await db.coupon.create({
      data: {
        shop: session.shop,
        title: result.data.title,
        code: result.data.code,
        discountType: result.data.discountType,
        discountValue: result.data.discountValue,
        minimumPurchase: result.data.minimumPurchase,
        usageLimit: result.data.usageLimit,
        startsAt: result.data.startsAt,
        endsAt: result.data.endsAt,
      },
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as Error & { code: string }).code === "P2002"
    ) {
      return json(
        { errors: { code: "A coupon with this code already exists" } },
        { status: 422 },
      );
    }
    throw error;
  }

  return redirect("/app?created=1");
};

export default function NewCouponPage() {
  const actionData = useActionData<{ errors?: ValidationErrors }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Page
      backAction={{ content: "Coupons", url: "/app" }}
      title="Create coupon"
    >
      <Layout>
        <Layout.Section>
          <CouponForm
            errors={actionData?.errors}
            isSubmitting={isSubmitting}
            submitLabel="Create coupon"
          />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
