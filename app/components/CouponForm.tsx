import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Form } from "@remix-run/react";
import {
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
import type { ValidationErrors } from "../utils/coupon-validation";

interface CouponFormProps {
  initialValues?: {
    title: string;
    code: string;
    discountType: string;
    discountValue: string;
    minimumPurchase: string;
    usageLimit: string;
    startsAt: string;
    endsAt: string;
  };
  errors?: ValidationErrors;
  isSubmitting: boolean;
  submitLabel: string;
  actionValue?: string;
  secondaryActions?: ReactNode;
}

export function CouponForm({
  initialValues,
  errors,
  isSubmitting,
  submitLabel,
  actionValue,
  secondaryActions,
}: CouponFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [code, setCode] = useState(initialValues?.code ?? "");
  const [discountType, setDiscountType] = useState(
    initialValues?.discountType ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    initialValues?.discountValue ?? "",
  );
  const [minimumPurchase, setMinimumPurchase] = useState(
    initialValues?.minimumPurchase ?? "",
  );
  const [usageLimit, setUsageLimit] = useState(
    initialValues?.usageLimit ?? "",
  );
  const [startsAt, setStartsAt] = useState(initialValues?.startsAt ?? "");
  const [endsAt, setEndsAt] = useState(initialValues?.endsAt ?? "");

  const handleDiscountTypeChange = useCallback(
    (value: string) => setDiscountType(value),
    [],
  );

  return (
    <Form method="post">
      {actionValue && (
        <input type="hidden" name="_action" value={actionValue} />
      )}
      <BlockStack gap="400">
        {errors && Object.keys(errors).length > 0 && (
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
                value={title}
                onChange={setTitle}
                autoComplete="off"
                helpText="Internal name for this coupon"
                error={errors?.title}
              />
              <TextField
                label="Coupon code"
                name="code"
                value={code}
                onChange={setCode}
                autoComplete="off"
                helpText="Customers enter this code at checkout (auto-uppercased)"
                error={errors?.code}
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
                  value={discountType}
                  onChange={handleDiscountTypeChange}
                  options={[
                    { label: "Percentage", value: "percentage" },
                    { label: "Fixed amount", value: "fixed_amount" },
                  ]}
                  error={errors?.discountType}
                />
                <TextField
                  label="Value"
                  name="discountValue"
                  value={discountValue}
                  onChange={setDiscountValue}
                  type="number"
                  autoComplete="off"
                  error={errors?.discountValue}
                />
              </FormLayout.Group>
              <TextField
                label="Minimum purchase amount"
                name="minimumPurchase"
                value={minimumPurchase}
                onChange={setMinimumPurchase}
                type="number"
                autoComplete="off"
                helpText="Leave empty for no minimum"
                error={errors?.minimumPurchase}
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
                value={usageLimit}
                onChange={setUsageLimit}
                type="number"
                autoComplete="off"
                helpText="Leave empty for unlimited usage"
                error={errors?.usageLimit}
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
                  value={startsAt}
                  onChange={setStartsAt}
                  type="date"
                  autoComplete="off"
                  error={errors?.startsAt}
                />
                <TextField
                  label="End date"
                  name="endsAt"
                  value={endsAt}
                  onChange={setEndsAt}
                  type="date"
                  autoComplete="off"
                  helpText="Leave empty for no end date"
                  error={errors?.endsAt}
                />
              </FormLayout.Group>
            </FormLayout>
          </BlockStack>
        </Card>

        <InlineStack align="end">
          {secondaryActions}
          <Button submit variant="primary" loading={isSubmitting}>
            {submitLabel}
          </Button>
        </InlineStack>
      </BlockStack>
    </Form>
  );
}
