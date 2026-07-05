import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  IndianRupee,
  Package,
  Search,
  ShoppingCart,
  Smartphone,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CenteredLoader,
  Grid,
  Icon,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { useResolvedSellPath } from '@inventory-platform/routing';
import { useAuthStore, useNotify, useShopCapabilitiesStore } from '@inventory-platform/session';
import type { DashboardData } from '@inventory-platform/shell/types';
import { dashboardApi } from '../api/dashboard.api';
import styles from './overview.module.css';

export function meta() {
  return [
    { title: 'Dashboard - StockKart' },
    { name: 'description', content: 'Inventory management dashboard' },
  ];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtext?: string;
  change?: number;
}

function MetricCard({ icon, label, value, subtext, change }: MetricCardProps) {
  return (
    <Card>
      <CardBody>
        <div className={styles.metricRow}>
          <div className={styles.metricIcon}>
            <Icon icon={icon} size="md" />
          </div>
          <Stack gap="xs">
            <Text variant="heading3" weight="bold">
              {value}
            </Text>
            <Text color="secondary" variant="caption">
              {label}
            </Text>
            {change !== undefined && change !== 0 ? (
              <Text
                variant="caption"
                className={change > 0 ? styles.changeUp : styles.changeDown}
              >
                {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
              </Text>
            ) : null}
            {subtext ? (
              <Text color="muted" variant="caption">
                {subtext}
              </Text>
            ) : null}
          </Stack>
        </div>
      </CardBody>
    </Card>
  );
}

interface InsightItemProps {
  label: string;
  value: string;
}

function InsightItem({ label, value }: InsightItemProps) {
  return (
    <div className={styles.insightItem}>
      <Text color="secondary" variant="caption">
        {label}
      </Text>
      <Text variant="heading4" weight="semibold">
        {value}
      </Text>
    </div>
  );
}

interface RevenueItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function RevenueItem({ icon, label, value }: RevenueItemProps) {
  return (
    <div className={styles.revenueItem}>
      <Stack direction="row" gap="sm" align="center">
        <Icon icon={icon} size="sm" />
        <Text color="secondary" variant="caption">
          {label}
        </Text>
      </Stack>
      <Text variant="heading4" weight="semibold">
        {value}
      </Text>
    </div>
  );
}

export function OverviewPage() {
  const navigate = useNavigate();
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined
  );
  const sellPath = useResolvedSellPath(shopCapabilities ?? null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await dashboardApi.getDashboard();
        setDashboardData(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(message);
        notifyError(message);
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchDashboardData();
  }, [notifyError]);

  if (loading) {
    return (
      <CenteredLoader
        label="Loading dashboard…"
        size="lg"
        fill
        className={styles.centered}
      />
    );
  }

  if (error) {
    return (
      <Alert variant="danger" role="alert">
        {error}
      </Alert>
    );
  }

  if (!dashboardData) {
    return (
      <Alert variant="warning" role="status">
        No dashboard data available.
      </Alert>
    );
  }

  const { keyMetrics, revenueBreakdown, productInsights } = dashboardData;

  return (
    <Stack gap="lg">
      <Text color="secondary" variant="body">
        Today&apos;s snapshot across products, sales, and inventory.
      </Text>

      <Grid columns={4} gap="md" className={styles.statsGrid}>
        <MetricCard
          icon={Package}
          label="Total Products"
          value={formatNumber(keyMetrics.totalProducts)}
        />
        <MetricCard
          icon={IndianRupee}
          label="Revenue Today"
          value={formatCurrency(keyMetrics.totalRevenueToday)}
          change={revenueBreakdown.percentageChangeToday}
        />
        <MetricCard
          icon={ShoppingCart}
          label="Orders Today"
          value={formatNumber(keyMetrics.ordersToday)}
          subtext={`Avg: ${formatCurrency(keyMetrics.averageOrderValue)}`}
        />
        <MetricCard
          icon={TriangleAlert}
          label="Low Stock Items"
          value={formatNumber(keyMetrics.lowStockItemsCount)}
        />
      </Grid>

      <Grid columns={2} gap="md" className={styles.contentGrid}>
        <Card>
          <CardHeader>
            <Text variant="heading4" weight="semibold">
              Quick Actions
            </Text>
          </CardHeader>
          <CardBody>
            <div className={styles.quickActions}>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Icon icon={Package} size="sm" />}
                onClick={() => navigate('/dashboard/product-registration')}
              >
                Add Product
              </Button>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Icon icon={Search} size="sm" />}
                onClick={() => navigate('/dashboard/product-search')}
              >
                Search Product
              </Button>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Icon icon={Smartphone} size="sm" />}
                onClick={() => navigate(sellPath)}
              >
                Scan &amp; Sell
              </Button>
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Icon icon={TrendingUp} size="sm" />}
                onClick={() => navigate('/dashboard/analytics')}
              >
                Analytics
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Text variant="heading4" weight="semibold">
              Product Insights
            </Text>
          </CardHeader>
          <CardBody>
            <div className={styles.insightsGrid}>
              <InsightItem
                label="Unique Products"
                value={formatNumber(productInsights.totalUniqueProducts)}
              />
              <InsightItem
                label="Added Today"
                value={formatNumber(productInsights.productsAddedToday)}
              />
              <InsightItem
                label="Added This Week"
                value={formatNumber(productInsights.productsAddedThisWeek)}
              />
              <InsightItem
                label="Out of Stock"
                value={formatNumber(productInsights.outOfStockItems)}
              />
            </div>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardHeader>
          <Text variant="heading4" weight="semibold">
            Revenue Breakdown
          </Text>
        </CardHeader>
        <CardBody>
          <div className={styles.revenueGrid}>
            <RevenueItem
              icon={Calendar}
              label="Today"
              value={formatCurrency(revenueBreakdown.today)}
            />
            <RevenueItem
              icon={Calendar}
              label="Yesterday"
              value={formatCurrency(revenueBreakdown.yesterday)}
            />
            <RevenueItem
              icon={TrendingUp}
              label="This Week"
              value={formatCurrency(revenueBreakdown.thisWeek)}
            />
            <RevenueItem
              icon={IndianRupee}
              label="This Month"
              value={formatCurrency(revenueBreakdown.thisMonth)}
            />
          </div>
        </CardBody>
      </Card>
    </Stack>
  );
}
