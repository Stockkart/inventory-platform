import { useEffect, useId, useRef, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import {
  Box,
  Button,
  Icon,
  IconButton,
  Inline,
  Input,
  Text,
  cn,
  hrChrome,
} from '@inventory-platform/ui-kit';

export interface AttendanceNotePopoverProps {
  /** Employee name, for the spoken names ("Add note for Asha"). */
  name: string;
  value: string;
  maxLength: number;
  onChange: (note: string) => void;
}

/**
 * The note of one daily attendance row behind a small icon button (run F9), so the row stays one
 * line. The icon turns brand-coloured when a note is written. The panel closes on Done, Enter,
 * Escape (focus goes back to the button), a click outside or focus leaving the popover (run F10).
 */
export function AttendanceNotePopover({
  name,
  value,
  maxLength,
  onChange,
}: AttendanceNotePopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const panelId = useId();

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const hasNote = value.trim().length > 0;

  return (
    <Box
      as="span"
      ref={rootRef}
      className={hrChrome.hrNoteAnchor}
      // Tabbing (or otherwise moving focus) out of the button + panel closes it. A null
      // relatedTarget (window blur, click on nothing focusable) is left to the outside-click
      // handler, so switching windows does not close the note.
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (open && next && !e.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <IconButton
        size="sm"
        label={hasNote ? `Edit note for ${name}` : `Add note for ${name}`}
        className={cn(hrChrome.hrIconButtonSm, hasNote && hrChrome.hrIconButtonActive)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(!open)}
      >
        <Icon icon={MessageSquareText} size="sm" />
      </IconButton>
      {open ? (
        <Box
          id={panelId}
          role="dialog"
          aria-label={`Note for ${name}`}
          className={hrChrome.hrNotePanel}
        >
          <Input
            aria-label={`Note, ${name}`}
            placeholder="For example: came back after lunch"
            value={value}
            maxLength={maxLength}
            autoFocus
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                close(true);
              }
            }}
          />
          <Inline justify="between" gap="sm">
            <Text as="span" variant="caption" color="muted">
              {value.length}/{maxLength}
            </Text>
            <Button type="button" size="sm" variant="outline" onClick={() => close(true)}>
              Done
            </Button>
          </Inline>
        </Box>
      ) : null}
    </Box>
  );
}
