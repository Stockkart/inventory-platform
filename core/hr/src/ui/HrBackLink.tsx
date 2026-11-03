import { useNavigate } from 'react-router';
import { Button, Inline } from '@inventory-platform/ui-kit';

export interface HrBackLinkProps {
  to: string;
  /** Plain words after the arrow, e.g. "All employees". */
  label: string;
}

/**
 * "← All employees" at the top-left of an HR detail page: the same ghost `Button` and arrow as
 * accounting's "← Back to journal", kept on its own line so it never stretches across the page.
 */
export function HrBackLink({ to, label }: HrBackLinkProps) {
  const navigate = useNavigate();
  return (
    <Inline>
      <Button type="button" variant="ghost" size="sm" onClick={() => navigate(to)}>
        ← {label}
      </Button>
    </Inline>
  );
}
