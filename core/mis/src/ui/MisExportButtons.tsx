import { Button, Inline } from '@inventory-platform/ui-kit';

export interface MisExportButtonsProps {
  downloading: 'excel' | 'pdf' | null;
  disabled?: boolean;
  onExcel: () => void;
  onPdf: () => void;
}

/** Shared Excel + PDF download actions for MIS report pages. */
export function MisExportButtons({ downloading, disabled, onExcel, onPdf }: MisExportButtonsProps) {
  return (
    <Inline gap="sm" flexWrap>
      <Button
        type="button"
        variant="solid"
        size="sm"
        onClick={onExcel}
        loading={downloading === 'excel'}
        disabled={disabled || downloading != null}
      >
        Download Excel
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPdf}
        loading={downloading === 'pdf'}
        disabled={disabled || downloading != null}
      >
        Download PDF
      </Button>
    </Inline>
  );
}
