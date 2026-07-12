import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Calendar,
  Circle,
  CircleDollarSign,
  ClipboardList,
  Coffee,
  Contact,
  CreditCard,
  Factory,
  Handshake,
  Inbox,
  LayoutDashboard,
  Lock,
  Mail,
  Megaphone,
  MessageCircle,
  Package,
  PencilLine,
  Receipt,
  Scale,
  ScrollText,
  Search,
  ShoppingCart,
  Smartphone,
  Store,
  TrendingUp,
  TriangleAlert,
  Truck,
  Undo2,
  Upload,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import type { NavIconName } from '@inventory-platform/routing';
import { Icon, type IconProps } from '@inventory-platform/ui-kit';

const NAV_ICON_REGISTRY: Record<NavIconName, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  package: Package,
  search: Search,
  wrench: Wrench,
  smartphone: Smartphone,
  'undo-2': Undo2,
  upload: Upload,
  'trending-up': TrendingUp,
  'scroll-text': ScrollText,
  contact: Contact,
  users: Users,
  truck: Truck,
  store: Store,
  user: User,
  mail: Mail,
  inbox: Inbox,
  handshake: Handshake,
  megaphone: Megaphone,
  'message-circle': MessageCircle,
  coffee: Coffee,
  'shopping-cart': ShoppingCart,
  'clipboard-list': ClipboardList,
  'circle-dollar-sign': CircleDollarSign,
  'credit-card': CreditCard,
  receipt: Receipt,
  calendar: Calendar,
  'triangle-alert': TriangleAlert,
  'book-open': BookOpen,
  'pencil-line': PencilLine,
  factory: Factory,
  scale: Scale,
  lock: Lock,
  circle: Circle,
};

export interface NavIconProps extends Omit<IconProps, 'icon'> {
  name: NavIconName;
}

export function NavIcon({ name, ...rest }: NavIconProps) {
  const LucideComponent = NAV_ICON_REGISTRY[name] ?? Circle;
  return <Icon icon={LucideComponent} {...rest} />;
}
