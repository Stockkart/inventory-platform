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
  /** Totals columns of the month register (right-aligned numbers). */
  hrRegisterTotalCell: styles.hrRegisterTotalCell,
  /** One employee row on the daily attendance screen; single column below 768 px. */
  hrDailyRow: styles.hrDailyRow,
  hrDailyRowName: styles.hrDailyRowName,
  hrDailyRowControls: styles.hrDailyRowControls,
  /** Narrow in/out time box on the daily screen. */
  hrTimeInput: styles.hrTimeInput,
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
