import React, { useState, useEffect, useCallback } from "react";
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
  IndexFilters,
  useSetIndexFiltersMode,
  Pagination,
  ChoiceList,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { formatDiscount, getCouponStatus } from "../utils/format-discount";
import { parseCouponListParams, buildCouponListQuery } from "../utils/coupon-list-query";
import { deleteShopifyDiscount } from "../utils/shopify-discount.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const url = new URL(request.url);
  const params = parseCouponListParams(url.searchParams);
  const query = buildCouponListQuery(session.shop, params);

  const [coupons, totalCount] = await Promise.all([
    db.coupon.findMany(query),
    db.coupon.count({ where: query.where }),
  ]);

  return json({
    coupons,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    status: params.status,
    discountType: params.discountType,
    sort: params.sort,
    direction: params.direction,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("_action") as string;

  if (intent === "bulkDelete") {
    const ids = formData.getAll("ids").map(Number).filter((n) => !isNaN(n));
    if (ids.length > 0) {
      // Find coupons with Shopify discount IDs
      const couponsToDelete = await db.coupon.findMany({
        where: { id: { in: ids }, shop: session.shop },
        select: { shopifyDiscountId: true },
      });

      // Best-effort delete from Shopify
      for (const c of couponsToDelete) {
        if (c.shopifyDiscountId) {
          try {
            await deleteShopifyDiscount(admin, c.shopifyDiscountId);
          } catch (error) {
            console.error("Failed to delete Shopify discount:", error);
          }
        }
      }

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
  const loaderData = useLoaderData<typeof loader>();
  const { coupons, totalCount, page, pageSize } = loaderData;
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();

  // Toast system
  useEffect(() => {
    const toasts: Record<string, string> = {
      created: "Coupon created successfully",
      updated: "Coupon updated successfully",
      deleted: "Coupon deleted successfully",
      syncError: "Coupon saved locally but failed to sync with Shopify",
    };
    for (const [param, message] of Object.entries(toasts)) {
      if (searchParams.get(param) === "1") {
        shopify.toast.show(message);
        setSearchParams({}, { replace: true });
        break;
      }
    }
  }, [searchParams, shopify, setSearchParams]);

  // IndexFilters mode
  const { mode, setMode } = useSetIndexFiltersMode();

  // Search state (debounced)
  const [queryValue, setQueryValue] = useState(loaderData.search);

  // Helper to update URL params (triggers loader re-fetch)
  const updateUrlParams = useCallback((updates: Partial<{
    search: string;
    status: string[];
    discountType: string[];
    sort: string;
    direction: string;
    page: number;
  }>) => {
    const params = new URLSearchParams();
    const search = updates.search ?? loaderData.search;
    const status = updates.status ?? loaderData.status;
    const discountType = updates.discountType ?? loaderData.discountType;
    const sort = updates.sort ?? loaderData.sort;
    const direction = updates.direction ?? loaderData.direction;
    const pg = updates.page ?? loaderData.page;

    if (search) params.set("search", search);
    status.forEach((s) => params.append("status", s));
    discountType.forEach((t) => params.append("discountType", t));
    if (sort !== "createdAt" || direction !== "desc") {
      params.set("sort", sort);
      params.set("direction", direction);
    }
    if (pg > 1) params.set("page", String(pg));

    navigate(`?${params.toString()}`, { replace: true });
  }, [loaderData, navigate]);

  // Debounce search: update URL 300ms after typing stops
  useEffect(() => {
    if (queryValue === loaderData.search) return;
    const timer = setTimeout(() => {
      updateUrlParams({ search: queryValue, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  }, [queryValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort options for IndexFilters
  const sortOptions = [
    { label: "Code", value: "code asc" as const, directionLabel: "A-Z" },
    { label: "Code", value: "code desc" as const, directionLabel: "Z-A" },
    { label: "Created", value: "createdAt asc" as const, directionLabel: "Oldest first" },
    { label: "Created", value: "createdAt desc" as const, directionLabel: "Newest first" },
    { label: "Discount", value: "discountValue asc" as const, directionLabel: "Low to high" },
    { label: "Discount", value: "discountValue desc" as const, directionLabel: "High to low" },
  ];
  const sortSelected = [`${loaderData.sort} ${loaderData.direction}`];

  // Filters for IndexFilters
  const filters = [
    {
      key: "status",
      label: "Status",
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            { label: "Active", value: "active" },
            { label: "Scheduled", value: "scheduled" },
            { label: "Expired", value: "expired" },
            { label: "Inactive", value: "inactive" },
          ]}
          selected={loaderData.status}
          onChange={(selected: string[]) => updateUrlParams({ status: selected, page: 1 })}
          allowMultiple
        />
      ),
      shortcut: true,
    },
    {
      key: "discountType",
      label: "Discount type",
      filter: (
        <ChoiceList
          title="Discount type"
          titleHidden
          choices={[
            { label: "Percentage", value: "percentage" },
            { label: "Fixed amount", value: "fixed_amount" },
          ]}
          selected={loaderData.discountType}
          onChange={(selected: string[]) => updateUrlParams({ discountType: selected, page: 1 })}
          allowMultiple
        />
      ),
      shortcut: true,
    },
  ];

  // Applied filter pills
  const appliedFilters = [];
  if (loaderData.status.length > 0) {
    appliedFilters.push({
      key: "status",
      label: `Status: ${loaderData.status.join(", ")}`,
      onRemove: () => updateUrlParams({ status: [], page: 1 }),
    });
  }
  if (loaderData.discountType.length > 0) {
    appliedFilters.push({
      key: "discountType",
      label: `Type: ${loaderData.discountType.join(", ")}`,
      onRemove: () => updateUrlParams({ discountType: [], page: 1 }),
    });
  }

  // Selection state
  const resourceName = { singular: "coupon", plural: "coupons" };
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(
      coupons.map((c) => ({ ...c, id: String(c.id) })),
    );

  // Bulk actions
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

  // Check if any filters are active (for empty state logic)
  const hasFilters = loaderData.search !== "" || loaderData.status.length > 0 || loaderData.discountType.length > 0;

  // Empty state: no coupons and no filters = first-time empty state
  if (coupons.length === 0 && !hasFilters) {
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
        <Card padding="0">
          <IndexFilters
            queryValue={queryValue}
            queryPlaceholder="Search by code or title"
            onQueryChange={setQueryValue}
            onQueryClear={() => setQueryValue("")}
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            onSort={(selected) => {
              const [field, dir] = selected[0].split(" ");
              updateUrlParams({ sort: field, direction: dir, page: 1 });
            }}
            filters={filters}
            appliedFilters={appliedFilters}
            onClearAll={() => {
              setQueryValue("");
              updateUrlParams({ status: [], discountType: [], search: "", page: 1 });
            }}
            mode={mode}
            setMode={setMode}
            tabs={[]}
            selected={0}
            canCreateNewView={false}
          />
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
            emptyState={
              hasFilters ? (
                <EmptyState
                  heading="No coupons found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Try changing the filters or search term.</p>
                </EmptyState>
              ) : undefined
            }
          >
            {rowMarkup}
          </IndexTable>
        </Card>
        {totalCount > pageSize && (
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
            <Pagination
              hasPrevious={page > 1}
              hasNext={page * pageSize < totalCount}
              onPrevious={() => updateUrlParams({ page: page - 1 })}
              onNext={() => updateUrlParams({ page: page + 1 })}
            />
          </div>
        )}
      </BlockStack>
    </Page>
  );
}
