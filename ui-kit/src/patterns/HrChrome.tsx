import styles from './HrChrome.module.css';

/** Classes for HR pages in `core/hr` (attendance registers, daily marking, settings). */
export const hrChrome = {
  /** Row above a register: month/day chooser, then actions; wraps on phones. */
  hrPageToolbar: styles.hrPageToolbar,
  /** Right-aligned actions inside `hrPageToolbar`. */
  hrPageToolbarEnd: styles.hrPageToolbarEnd,
  /** Sideways-scrolling frame around the month register table. */
  hrRegisterScroll: styles.hrRegisterScroll,
  /** Employee name column of the month register; stays put while scrolling. */
  hrRegisterNameCell: styles.hrRegisterNameCell,
  /** One day column of the month register (holds an `AttendanceCell`). */
  hrRegisterDayCell: styles.hrRegisterDayCell,
  /** Day header of the month register: day number over the weekday letter. */
  hrRegisterDayHead: styles.hrRegisterDayHead,
  /** Totals columns of the month register (right-aligned numbers). */
  hrRegisterTotalCell: styles.hrRegisterTotalCell,
  /** Daily attendance list: sizes its rows from its own width (container query). */
  hrDailyList: styles.hrDailyList,
  /** Line above the daily list (date · counts). */
  hrDailySummary: styles.hrDailySummary,
  /**
   * One employee on the daily list: one compact line (who | status | times | actions), two
   * tight lines when the list is narrower than 48rem.
   */
  hrDailyRow: styles.hrDailyRow,
  hrDailyRowWho: styles.hrDailyRowWho,
  hrDailyRowAvatar: styles.hrDailyRowAvatar,
  hrDailyRowName: styles.hrDailyRowName,
  /** Chips then code · designation under the name; the text part shrinks, chips wrap. */
  hrDailyRowMeta: styles.hrDailyRowMeta,
  /** The code · designation text inside `hrDailyRowMeta` (the part that truncates). */
  hrDailyRowMetaText: styles.hrDailyRowMetaText,
  hrDailyRowStatus: styles.hrDailyRowStatus,
  /** In/out times (or the read-only summary) column. */
  hrDailyRowControls: styles.hrDailyRowControls,
  /** Add to `hrDailyRowControls` when it holds a sentence: spans times + actions, wraps. */
  hrDailyRowControlsWide: styles.hrDailyRowControlsWide,
  /** Note and clear buttons, right-aligned. */
  hrDailyRowActions: styles.hrDailyRowActions,
  /** Row error spanning the whole row. */
  hrDailyRowError: styles.hrDailyRowError,
  /** Two-digit day box between − / + buttons. */
  hrDayInput: styles.hrDayInput,
  /** Small in/out time box on the daily list. */
  hrTimeInput: styles.hrTimeInput,
  /** Small status chip (on a `Badge`): Late, On leave, Not saved. */
  hrChip: styles.hrChip,
  /** 2rem icon button for dense rows; `hrIconButtonActive` when its value is set. */
  hrIconButtonSm: styles.hrIconButtonSm,
  hrIconButtonActive: styles.hrIconButtonActive,
  /** Small popover next to an icon button (the daily list's note). */
  hrNoteAnchor: styles.hrNoteAnchor,
  hrNotePanel: styles.hrNotePanel,
  /** On the Add employee "Add from your team" `FilterDropdown`: fits the modal, text truncates. */
  hrTeamPicker: styles.hrTeamPicker,
  /** Clickable mark in a month register cell (opens the day detail). */
  hrRegisterDayButton: styles.hrRegisterDayButton,
  /** Day detail drawer body: padded, scrolls on its own. */
  hrDayDrawer: styles.hrDayDrawer,
  /** Colour key for attendance marks. */
  hrLegend: styles.hrLegend,
  hrLegendItem: styles.hrLegendItem,
  /** Content of a `CalendarMonthGrid` day: number above the mark. */
  hrCalendarDay: styles.hrCalendarDay,
  hrCalendarDayNumber: styles.hrCalendarDayNumber,
  /** HR tab on the Profile page. */
  hrSettingsSection: styles.hrSettingsSection,
  /** Wrapper of the HR inbox bell, so the unread dot sits on its corner. */
  hrInboxAnchor: styles.hrInboxAnchor,
} as const;
