import type { UserRole } from '@inventory-platform/types';
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
  return (
    <Badge variant={roleVariant(role)} className={className}>
      {role}
    </Badge>
  );
}
