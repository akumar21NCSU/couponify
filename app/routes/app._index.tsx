import React, { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate, useSearchParams } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  EmptyState,
  BlockStack,
  useIndexResourceState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { formatDiscount, getCouponStatus } from "../utils/format-discount";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const coupons = await db.coupon.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
  });

  return json({ coupons });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("_action") as string;

  if (intent === "bulkDelete") {
    const ids = formData.getAll("ids").map(Number).filter((n) => !isNaN(n));
    if (ids.length > 0) {
      await db.coupon.deleteMany({
        where: { id: { in: ids }, shop: session.shop },
      });
    }
    return json({ deleted: ids.length });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

function ToggleCell({ couponId, isActive }: { couponId: number; isActive: boolean }) {
  const fetcher = useFetcher();
  const optimisticActive = fetcher.formData
    ? !isActive
    : isActive;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div onClick={(e) => e.stopPropagation()}>
      <fetcher.Form method="post" action={`/app/coupons/${couponId}`}>
        <input type="hidden" name="_action" value="toggle" />
        <Button
          size="slim"
          submit
          loading={fetcher.state !== "idle"}
        >
          {optimisticActive ? "Deactivate" : "Activate"}
        </Button>
      </fetcher.Form>
    </div>
  );
}

export default function CouponsIndex() {
  const { coupons } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show toast when redirected after creating/updating/deleting a coupon
  useEffect(() => {
    const toasts: Record<string, string> = {
      created: "Coupon created successfully",
      updated: "Coupon updated successfully",
      deleted: "Coupon deleted successfully",
    };
    for (const [param, message] of Object.entries(toasts)) {
      if (searchParams.get(param) === "1") {
        shopify.toast.show(message);
        setSearchParams({}, { replace: true });
        break;
      }
    }
  }, [searchParams, shopify, setSearchParams]);

  const resourceName = { singular: "coupon", plural: "coupons" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      coupons.map((c) => ({ ...c, id: String(c.id) })),
    );

  const bulkDeleteFetcher = useFetcher();

  const promotedBulkActions = [
    {
      content: "Delete coupons",
      onAction: () => {
        const formData = new FormData();
        formData.set("_action", "bulkDelete");
        selectedResources.forEach((id) => formData.append("ids", id));
        bulkDeleteFetcher.submit(formData, { method: "post" });
      },
    },
  ];

  if (coupons.length === 0) {
    return (
      <Page>
        <TitleBar title="Coupons" />
        <Card>
          <EmptyState
            heading="Create your first coupon"
            action={{ content: "Create coupon", onAction: () => navigate("/app/coupons/new") }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>Create discount coupons for your customers to use at checkout.</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  const statusBadge = (coupon: typeof coupons[number]) => {
    const status = getCouponStatus(coupon.isActive, coupon.startsAt, coupon.endsAt);
    const toneMap = {
      active: "success",
      scheduled: "info",
      expired: "warning",
      inactive: undefined,
    } as const;
    return <Badge tone={toneMap[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const rowMarkup = coupons.map((coupon, index) => (
    <IndexTable.Row
      id={String(coupon.id)}
      key={coupon.id}
      selected={selectedResources.includes(String(coupon.id))}
      position={index}
      onClick={() => navigate(`/app/coupons/${coupon.id}`)}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="bold" as="span">
          {coupon.code}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{coupon.title}</IndexTable.Cell>
      <IndexTable.Cell>
        {formatDiscount(coupon.discountType, coupon.discountValue)}
      </IndexTable.Cell>
      <IndexTable.Cell>{statusBadge(coupon)}</IndexTable.Cell>
      <IndexTable.Cell>
        {coupon.usageCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : " / Unlimited"}
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(coupon.createdAt).toLocaleDateString()}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <ToggleCell couponId={coupon.id} isActive={coupon.isActive} />
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page>
      <TitleBar title="Coupons">
        <button variant="primary" onClick={() => navigate("/app/coupons/new")}>
          Create coupon
        </button>
      </TitleBar>
      <BlockStack gap="500">
        <Card>
          <IndexTable
            resourceName={resourceName}
            itemCount={coupons.length}
            selectedItemsCount={
              allResourcesSelected ? "All" : selectedResources.length
            }
            onSelectionChange={handleSelectionChange}
            promotedBulkActions={promotedBulkActions}
            headings={[
              { title: "Code" },
              { title: "Title" },
              { title: "Discount" },
              { title: "Status" },
              { title: "Usage" },
              { title: "Created" },
              { title: "Actions" },
            ]}
          >
            {rowMarkup}
          </IndexTable>
        </Card>
      </BlockStack>
    </Page>
  );
}
