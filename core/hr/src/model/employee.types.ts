/**
 * Employee DTOs — mirror `com.inventory.hr.rest.dto` (`EmployeeResponse`, `SaveEmployeeRequest`, …).
 * Money (`BigDecimal`) arrives as a JSON number. Without VIEW_SALARIES (and in every list row) the
 * backend masks pay: amounts/revisions/method/IFSC are null, account is `XXXXXX1234`, UPI is
 * `ra***@okaxis`, and `payHidden = true`. Show masked values exactly as given.
 */

/** Backend `PayType`. */
export type PayType = 'MONTHLY' | 'DAILY';

/** Backend `HrPaymentMethod`. */
export type HrPaymentMethod = 'CASH' | 'BANK' | 'UPI';

/** Backend `EmployeeStatus`. */
export type EmployeeStatus = 'ACTIVE' | 'EXITED';

/** `EmployeeResponse.SalaryRevisionResponse`. */
export interface SalaryRevisionResponse {
  /** YYYY-MM. */
  effectiveFrom: string;
  payType?: PayType | null;
  amount?: number | null;
}

/** `EmployeeResponse`: an employee as the caller may see it. */
export interface EmployeeResponse {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  designation?: string | null;
  /** Linked login; null = not linked. */
  userId?: string | null;
  /** yyyy-MM-dd. */
  joinDate?: string | null;
  status: EmployeeStatus;
  exitDate?: string | null;
  /** HH:mm own working hours; both or neither. */
  workStart?: string | null;
  workEnd?: string | null;
  /** Pay that applies this month; null when hidden or not set. */
  payType?: PayType | null;
  salaryAmount?: number | null;
  /** null when hidden. */
  salaryRevisions?: SalaryRevisionResponse[] | null;
  /** null when hidden. */
  paymentMethod?: HrPaymentMethod | null;
  /** Full, or `XXXXXX1234` when masked. */
  bankAccountNumber?: string | null;
  /** null when hidden. */
  ifsc?: string | null;
  /** Full, or `ra***@okaxis` when masked. */
  upiId?: string | null;
  /** True when pay was withheld from this caller (not "not set"). */
  payHidden: boolean;
  revision?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

/** `PageMeta` (API_CONTRACT PG3). */
export interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

/** `EmployeesPageResponse`: rows are always masked. */
export interface EmployeesPageResponse {
  items: EmployeeResponse[];
  page: PageMeta;
}

/**
 * `SaveEmployeeRequest`: create (POST) or full update (PUT).
 * - Pay (`payType`, `salaryAmount`, `salaryEffectiveFrom`) is read on create only; later changes
 *   go through `POST /employees/{id}/salary-revisions`.
 * - Payment fields need VIEW_SALARIES. Without it they must be null (kept as stored). With it the
 *   PUT replaces them, so a VIEW_SALARIES caller must send them back or they are cleared.
 * - `userId` null on update unlinks the login, so PUT must send the current link back.
 * - `revision` is required on update (stale = 409).
 */
export interface SaveEmployeeRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  designation?: string | null;
  /** Blank on create = next `EMP-nnn`. Required on update. */
  code?: string | null;
  userId?: string | null;
  joinDate?: string | null;
  workStart?: string | null;
  workEnd?: string | null;
  payType?: PayType | null;
  salaryAmount?: number | null;
  /** YYYY-MM; null = the join month. */
  salaryEffectiveFrom?: string | null;
  paymentMethod?: HrPaymentMethod | null;
  bankAccountNumber?: string | null;
  ifsc?: string | null;
  upiId?: string | null;
  revision?: number | null;
}

/** `AddSalaryRevisionRequest`: new pay from a month on; same month replaces that revision. */
export interface AddSalaryRevisionRequest {
  /** YYYY-MM. */
  effectiveFrom: string;
  payType: PayType;
  amount: number;
}

/** `ExitEmployeeRequest`. */
export interface ExitEmployeeRequest {
  /** yyyy-MM-dd, on or after the join date. */
  exitDate: string;
}

/** `LinkableLoginResponse`: a shop login that can be linked to an employee. */
export interface LinkableLoginResponse {
  userId: string;
  name?: string | null;
  role?: string | null;
  /** Employee already linked to this login; null = free. */
  linkedEmployeeId?: string | null;
}

/** Query params of `GET /employees` (backend default page 0, size 20, max 100). */
export interface EmployeeListParams {
  q?: string;
  status?: EmployeeStatus;
  designation?: string;
  page?: number;
  size?: number;
}
