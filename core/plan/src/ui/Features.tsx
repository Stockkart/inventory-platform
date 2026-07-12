import type { LucideIcon } from 'lucide-react';
import {
  Package,
  Search,
  ScanBarcode,
  CreditCard,
  ChartColumn,
  Bell,
  CalendarClock,
  Users,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import {
  FeatureCard,
  FeatureGrid,
  MarketingSection,
  SectionHeading,
} from '@inventory-platform/ui-kit';

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: Package,
    title: 'Product Registration',
    description:
      'Easily register and manage your product inventory with detailed information and categorization.',
  },
  {
    icon: Search,
    title: 'Product Search',
    description:
      'Quickly find products with powerful search and filtering capabilities across your entire inventory.',
  },
  {
    icon: ScanBarcode,
    title: 'Scan and Sell',
    description:
      'Speed up sales with barcode scanning functionality for instant product lookup and checkout.',
  },
  {
    icon: CreditCard,
    title: 'Payment & Billing',
    description:
      'Process payments seamlessly with integrated billing and invoice generation features.',
  },
  {
    icon: ChartColumn,
    title: 'Analytics Dashboard',
    description:
      'Gain insights with comprehensive analytics on sales, inventory turnover, and performance metrics.',
  },
  {
    icon: Bell,
    title: 'Inventory Low Alert',
    description:
      'Never run out of stock with automated alerts when inventory levels fall below thresholds.',
  },
  {
    icon: CalendarClock,
    title: 'Reminder',
    description:
      'Stay on top of expiring products and scheduled returns with smart reminder notifications.',
  },
  {
    icon: Users,
    title: 'Supplier & Customer Management',
    description: 'Manage relationships with suppliers and customers in one centralized platform.',
  },
  {
    icon: ShieldCheck,
    title: 'User Roles & Permissions',
    description:
      'Control access levels with customizable user roles and granular permission settings.',
  },
  {
    icon: Undo2,
    title: 'Returns & Refund Management',
    description: 'Handle returns and refunds efficiently with streamlined processing workflows.',
  },
];

export function Features() {
  return (
    <MarketingSection id="features" tone="canvas">
      <SectionHeading
        title="Powerful Features"
        lead="Everything you need to manage your inventory efficiently and scale your business operations."
      />
      <FeatureGrid>
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </FeatureGrid>
    </MarketingSection>
  );
}
