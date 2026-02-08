import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Select,
  Button,
  Banner,
  BlockStack,
  InlineStack,
  Text,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { validateCouponForm } from "../utils/coupon-validation";
import type { CouponFormData, ValidationErrors } from "../utils/coupon-validation";

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

  return redirect("/app");
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
          <Form method="post">
            <BlockStack gap="400">
              {actionData?.errors && Object.keys(actionData.errors).length > 0 && (
                <Banner tone="critical">
                  <p>There were errors with your submission. Please correct them below.</p>
                </Banner>
              )}

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingSm">
                    Coupon details
                  </Text>
                  <FormLayout>
                    <TextField
                      label="Title"
                      name="title"
                      autoComplete="off"
                      helpText="Internal name for this coupon"
                      error={actionData?.errors?.title}
                    />
                    <TextField
                      label="Coupon code"
                      name="code"
                      autoComplete="off"
                      helpText="Customers enter this code at checkout (auto-uppercased)"
                      error={actionData?.errors?.code}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingSm">
                    Discount value
                  </Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <Select
                        label="Discount type"
                        name="discountType"
                        options={[
                          { label: "Percentage", value: "percentage" },
                          { label: "Fixed amount", value: "fixed_amount" },
                        ]}
                        error={actionData?.errors?.discountType}
                      />
                      <TextField
                        label="Value"
                        name="discountValue"
                        type="number"
                        autoComplete="off"
                        error={actionData?.errors?.discountValue}
                      />
                    </FormLayout.Group>
                    <TextField
                      label="Minimum purchase amount"
                      name="minimumPurchase"
                      type="number"
                      autoComplete="off"
                      helpText="Leave empty for no minimum"
                      error={actionData?.errors?.minimumPurchase}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingSm">
                    Usage limits
                  </Text>
                  <FormLayout>
                    <TextField
                      label="Usage limit"
                      name="usageLimit"
                      type="number"
                      autoComplete="off"
                      helpText="Leave empty for unlimited usage"
                      error={actionData?.errors?.usageLimit}
                    />
                  </FormLayout>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingSm">
                    Active dates
                  </Text>
                  <FormLayout>
                    <FormLayout.Group>
                      <TextField
                        label="Start date"
                        name="startsAt"
                        type="date"
                        autoComplete="off"
                        error={actionData?.errors?.startsAt}
                      />
                      <TextField
                        label="End date"
                        name="endsAt"
                        type="date"
                        autoComplete="off"
                        helpText="Leave empty for no end date"
                        error={actionData?.errors?.endsAt}
                      />
                    </FormLayout.Group>
                  </FormLayout>
                </BlockStack>
              </Card>

              <InlineStack align="end">
                <Button submit variant="primary" loading={isSubmitting}>
                  Create coupon
                </Button>
              </InlineStack>
            </BlockStack>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
