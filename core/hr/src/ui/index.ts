// HR widgets are exported from here as they are added (tasks 16–22).
export { HrSettingsSection } from './HrSettingsSection';
export { HrSettingsForm, type HrSettingsFormProps } from './HrSettingsForm';
export { HolidaysCard, type HolidaysCardProps } from './HolidaysCard';
export { LeaveTypesCard, type LeaveTypesCardProps } from './LeaveTypesCard';
export {
  HrRolePermissionsCard,
  HrPermissionGridEditor,
  type HrPermissionGridEditorProps,
} from './HrRolePermissionsCard';
export {
  HrGetStartedCard,
  HR_SETTINGS_PROFILE_PATH,
  type HrGetStartedCardProps,
} from './HrGetStartedCard';
export { EmployeeForm, type EmployeeFormProps } from './EmployeeForm';
export { EmployeeProfileTab, type EmployeeProfileTabProps } from './EmployeeProfileTab';
export { EmployeeSalaryTab, type EmployeeSalaryTabProps } from './EmployeeSalaryTab';
export { LoginLinkPicker, type LoginLinkPickerProps } from './LoginLinkPicker';
export { AttendanceMark, AttendanceLegend, type AttendanceMarkProps } from './AttendanceMark';
export { AttendanceDailyRow, type AttendanceDailyRowProps } from './AttendanceDailyRow';
export { AttendanceDayDrawer, type AttendanceDayDrawerProps } from './AttendanceDayDrawer';
export {
  EmployeePicker,
  type EmployeePickerOption,
  type EmployeePickerProps,
} from './EmployeePicker';
export { LeaveTypePicker, type LeaveTypePickerProps } from './LeaveTypePicker';
export { RecordLeaveModal, type RecordLeaveModalProps } from './RecordLeaveModal';
export { MarkReasonModal, type MarkReasonModalProps } from './MarkReasonModal';
export { LeaveDecisionModal, type LeaveDecisionModalProps } from './LeaveDecisionModal';
export { LeaveRequestsTable, type LeaveRequestsTableProps } from './LeaveRequestsTable';
export { LeaveBalancesTable, type LeaveBalancesTableProps } from './LeaveBalancesTable';
export { EmployeeAttendanceTab, type EmployeeAttendanceTabProps } from './EmployeeAttendanceTab';
export { EmployeeLeaveTab, type EmployeeLeaveTabProps } from './EmployeeLeaveTab';
export { AdvancesTable, canCancelAdvance, type AdvancesTableProps } from './AdvancesTable';
export { AdvanceStatementTable, type AdvanceStatementTableProps } from './AdvanceStatementTable';
export { AdvanceStatementDrawer, type AdvanceStatementDrawerProps } from './AdvanceStatementDrawer';
export { GiveAdvanceModal, type GiveAdvanceModalProps } from './GiveAdvanceModal';
export { CancelAdvanceModal, type CancelAdvanceModalProps } from './CancelAdvanceModal';
export { EmployeeAdvancesTab, type EmployeeAdvancesTabProps } from './EmployeeAdvancesTab';
export { PayrollStatusBadge, PAYROLL_LIST_PATH, payrollRunPath } from './PayrollStatusBadge';
export { PayrollLinesTable, type PayrollLinesTableProps } from './PayrollLinesTable';
export { PayrollLineDrawer, type PayrollLineDrawerProps } from './PayrollLineDrawer';
export { UnmarkedDaysModal, type UnmarkedDaysModalProps } from './UnmarkedDaysModal';
export { ReopenPayrollModal, type ReopenPayrollModalProps } from './ReopenPayrollModal';
export {
  EmployeeNameLink,
  EMPLOYEES_PATH,
  employeePath,
  type EmployeeNameLinkProps,
} from './EmployeeNameLink';
export { HrBackLink, type HrBackLinkProps } from './HrBackLink';
export {
  EmployeePairingCard,
  PairingPanel,
  type EmployeePairingCardProps,
  type PairingPanelProps,
} from './EmployeePairingCard';
export { MyPairingCard } from './MyPairingCard';
export { RequestProfileButton, type RequestProfileButtonProps } from './RequestProfileButton';
export { AppHealthBanner, appHealthAlertText, formatFailureRate } from './AppHealthBanner';
// Worker-app: the manager's Join requests inbox (R4).
export { JoinRequestsTab, bulkResultText, joinRequestPageMeta } from './JoinRequestsTab';
export {
  JoinRequestRow,
  JoinRequestStatusBadge,
  RequestedTime,
  type JoinRequestRowProps,
  type RequestedTimeProps,
} from './JoinRequestRow';
export {
  DRAWER_IDLE,
  drawerReducer,
  exactTimeIst,
  reasonCounter,
  reasonTooLong,
  relativeTime,
  type DrawerAction,
  type DrawerSavingMode,
  type DrawerState,
} from './joinRequestDrawer';
export {
  PossibleMatchPanel,
  linkOrCreateQuestion,
  matchLabel,
  type PossibleMatchPanelProps,
} from './PossibleMatchPanel';
export {
  RejectReasonModal,
  rejectReasonError,
  type RejectReasonModalProps,
} from './RejectReasonModal';
export { JoinRequestPhoto, photoPath, type JoinRequestPhotoProps } from './JoinRequestPhoto';
