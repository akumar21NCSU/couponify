import { useState, useRef } from "react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { Page, Layout, Button, Modal } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { validateCouponForm } from "../utils/coupon-validation";
import type { CouponFormData, ValidationErrors } from "../utils/coupon-validation";
import { CouponForm } from "../components/CouponForm";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = Number(params.id);

  if (isNaN(id)) {
    throw new Response("Not found", { status: 404 });
  }

  const coupon = await db.coupon.findFirst({
    where: { id, shop: session.shop },
  });

  if (!coupon) {
    throw new Response("Not found", { status: 404 });
  }

  return json({ coupon });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const id = Number(params.id);

  if (isNaN(id)) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("_action") as string;

  // Verify coupon exists and belongs to this shop
  const existing = await db.coupon.findFirst({
    where: { id, shop: session.shop },
  });
  if (!existing) {
    throw new Response("Not found", { status: 404 });
  }

  // Branch on intent
  if (intent === "delete") {
    await db.coupon.delete({ where: { id } });
    return redirect("/app?deleted=1");
  }

  if (intent === "toggle") {
    await db.coupon.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
    return json({ success: true });
  }

  // Default: update
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
    await db.coupon.update({
      where: { id },
      data: {
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

  return redirect("/app?updated=1");
};

export default function EditCouponPage() {
  const { coupon } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ errors?: ValidationErrors }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);

  const initialValues = {
    title: coupon.title,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: String(coupon.discountValue),
    minimumPurchase: coupon.minimumPurchase != null ? String(coupon.minimumPurchase) : "",
    usageLimit: coupon.usageLimit != null ? String(coupon.usageLimit) : "",
    startsAt: new Date(coupon.startsAt).toISOString().split("T")[0],
    endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString().split("T")[0] : "",
  };

  return (
    <Page
      backAction={{ content: "Coupons", url: "/app" }}
      title="Edit coupon"
    >
      <Layout>
        <Layout.Section>
          <CouponForm
            initialValues={initialValues}
            errors={actionData?.errors}
            isSubmitting={isSubmitting}
            submitLabel="Save coupon"
            actionValue="update"
            secondaryActions={
              <Button
                tone="critical"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete coupon
              </Button>
            }
          />
        </Layout.Section>
      </Layout>

      <Form method="post" ref={deleteFormRef}>
        <input type="hidden" name="_action" value="delete" />
      </Form>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete coupon?"
        primaryAction={{
          content: "Delete",
          destructive: true,
          onAction: () => deleteFormRef.current?.submit(),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <p>
            This will permanently delete the coupon &quot;{coupon.code}&quot;.
            This action cannot be undone.
          </p>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
