import type { UserRole } from '@inventory-platform/user/types';
import { Badge, type BadgeVariant } from '@inventory-platform/ui-kit';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

function roleVariant(role: UserRole): BadgeVariant {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'danger';
    case 'MANAGER':
      return 'warning';
    case 'CASHIER':
      return 'info';
    default:
      return 'neutral';
  }
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const label = role.charAt(0) + role.slice(1).toLowerCase();
  return (
    <Badge variant={roleVariant(role)} className={className}>
      {label}
    </Badge>
  );
}
