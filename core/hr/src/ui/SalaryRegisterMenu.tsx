import { useState } from 'react';
import { Button, DropdownMenu } from '@inventory-platform/ui-kit';
import type { SalaryRegisterFormat } from '@inventory-platform/hr/types';

export interface SalaryRegisterMenuProps {
  /** Starts the download; the page shows progress and errors. */
  onDownload: (format: SalaryRegisterFormat) => void;
  loading?: boolean;
}

/** "Salary register" (R12.2, VIEW_SALARIES) as Excel or PDF, from the app's own menu. */
export function SalaryRegisterMenu({ onDownload, loading }: SalaryRegisterMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          type="button"
          variant="outline"
          loading={loading}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          Salary register
        </Button>
      }
      items={[
        { id: 'xlsx', label: 'Download Excel', onSelect: () => onDownload('xlsx') },
        { id: 'pdf', label: 'Open PDF', onSelect: () => onDownload('pdf') },
      ]}
    />
  );
}
