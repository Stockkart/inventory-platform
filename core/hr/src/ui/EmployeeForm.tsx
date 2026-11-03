import {
  FormField,
  FormRow,
  Input,
  SegmentedControl,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import {
  PAYMENT_METHOD_LABELS,
  PAY_TYPE_LABELS,
  type EmployeeFormErrors,
  type EmployeeFormValue,
  type HrPaymentMethod,
  type PayType,
} from '@inventory-platform/hr/types';

const PAY_TYPE_OPTIONS = (Object.keys(PAY_TYPE_LABELS) as PayType[]).map((value) => ({
  value,
  label: PAY_TYPE_LABELS[value],
}));
const METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as HrPaymentMethod[]).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
}));

export interface EmployeeFormProps {
  value: EmployeeFormValue;
  onChange: (next: EmployeeFormValue) => void;
  errors?: EmployeeFormErrors;
  /** Create form: code may be blank (next EMP-nnn) and pay can be set. */
  creating: boolean;
  /** Caller holds VIEW_SALARIES: pay (create) and payment details are shown. */
  withSalaries: boolean;
  /** Edit without VIEW_SALARIES: payslips go to this address, so it is shown but not editable. */
  emailReadOnly?: boolean;
  disabled?: boolean;
}

/** Employee details (R4.2). Ids are prefixed so the create and edit modals never collide. */
export function EmployeeForm({
  value,
  onChange,
  errors = {},
  creating,
  withSalaries,
  emailReadOnly = false,
  disabled,
}: EmployeeFormProps) {
  const id = (name: string) => `hr-employee-${creating ? 'new' : 'edit'}-${name}`;
  const set = <K extends keyof EmployeeFormValue>(key: K, v: EmployeeFormValue[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <Stack gap="sm">
      <FormField label="Name" id={id('name')} required error={errors.name}>
        <Input
          id={id('name')}
          value={value.name}
          maxLength={100}
          hasError={Boolean(errors.name)}
          onChange={(e) => set('name', e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <FormRow>
        <FormField
          label="Employee code"
          id={id('code')}
          hint={creating ? 'Leave blank to get the next code, like EMP-004.' : undefined}
          error={errors.code}
        >
          <Input
            id={id('code')}
            value={value.code}
            maxLength={20}
            hasError={Boolean(errors.code)}
            onChange={(e) => set('code', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Designation" id={id('designation')} error={errors.designation}>
          <Input
            id={id('designation')}
            value={value.designation}
            maxLength={50}
            placeholder="For example Helper"
            hasError={Boolean(errors.designation)}
            onChange={(e) => set('designation', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </FormRow>
      <FormRow>
        <FormField label="Phone" id={id('phone')} error={errors.phone}>
          <Input
            id={id('phone')}
            type="tel"
            value={value.phone}
            hasError={Boolean(errors.phone)}
            onChange={(e) => set('phone', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField
          label="Email"
          id={id('email')}
          hint={
            emailReadOnly ? 'Only someone who can see salaries can change the email.' : undefined
          }
          error={errors.email}
        >
          <Input
            id={id('email')}
            type="email"
            value={value.email}
            readOnly={emailReadOnly}
            hasError={Boolean(errors.email)}
            onChange={(e) => {
              if (!emailReadOnly) set('email', e.target.value);
            }}
            disabled={disabled}
          />
        </FormField>
      </FormRow>
      <FormField label="Join date" id={id('join-date')} required error={errors.joinDate}>
        <Input
          id={id('join-date')}
          type="date"
          value={value.joinDate}
          hasError={Boolean(errors.joinDate)}
          onChange={(e) => set('joinDate', e.target.value)}
          disabled={disabled}
        />
      </FormField>
      <FormRow>
        <FormField
          label="Own start time"
          id={id('work-start')}
          hint="Leave both times blank to use the shop's hours."
          error={errors.workStart}
        >
          <Input
            id={id('work-start')}
            type="time"
            value={value.workStart}
            hasError={Boolean(errors.workStart)}
            onChange={(e) => set('workStart', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Own end time" id={id('work-end')}>
          <Input
            id={id('work-end')}
            type="time"
            value={value.workEnd}
            onChange={(e) => set('workEnd', e.target.value)}
            disabled={disabled}
          />
        </FormField>
      </FormRow>

      {withSalaries && creating ? (
        <Stack gap="xs">
          <Text variant="label" as="span">
            Pay
          </Text>
          <SegmentedControl
            aria-label="Pay type"
            value={value.payType || 'MONTHLY'}
            options={PAY_TYPE_OPTIONS}
            onChange={(v) => set('payType', v)}
            disabled={disabled}
          />
          <FormField
            label={value.payType === 'DAILY' ? 'Wage per day (₹)' : 'Salary per month (₹)'}
            id={id('salary')}
            hint="Leave blank to add pay later."
            error={errors.salaryAmount ?? errors.payType}
          >
            <Input
              id={id('salary')}
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              value={value.salaryAmount}
              hasError={Boolean(errors.salaryAmount)}
              onChange={(e) =>
                onChange({
                  ...value,
                  salaryAmount: e.target.value,
                  // Typing an amount picks the pay type shown in the control.
                  payType: value.payType || 'MONTHLY',
                })
              }
              disabled={disabled}
            />
          </FormField>
        </Stack>
      ) : null}

      {withSalaries ? (
        <Stack gap="xs">
          <Text variant="label" as="span">
            Paid by
          </Text>
          <SegmentedControl
            aria-label="Payment method"
            value={value.paymentMethod}
            options={METHOD_OPTIONS}
            onChange={(v) => set('paymentMethod', v)}
            disabled={disabled}
          />
          {value.paymentMethod === 'BANK' ? (
            <FormRow>
              <FormField
                label="Bank account number"
                id={id('account')}
                error={errors.bankAccountNumber}
              >
                <Input
                  id={id('account')}
                  inputMode="numeric"
                  autoComplete="off"
                  value={value.bankAccountNumber}
                  hasError={Boolean(errors.bankAccountNumber)}
                  onChange={(e) => set('bankAccountNumber', e.target.value)}
                  disabled={disabled}
                />
              </FormField>
              <FormField label="IFSC" id={id('ifsc')} error={errors.ifsc}>
                <Input
                  id={id('ifsc')}
                  autoComplete="off"
                  maxLength={11}
                  placeholder="ABCD0123456"
                  value={value.ifsc}
                  hasError={Boolean(errors.ifsc)}
                  onChange={(e) => set('ifsc', e.target.value.toUpperCase())}
                  disabled={disabled}
                />
              </FormField>
            </FormRow>
          ) : null}
          {value.paymentMethod === 'UPI' ? (
            <FormField label="UPI ID" id={id('upi')} error={errors.upiId}>
              <Input
                id={id('upi')}
                autoComplete="off"
                placeholder="name@bank"
                value={value.upiId}
                hasError={Boolean(errors.upiId)}
                onChange={(e) => set('upiId', e.target.value)}
                disabled={disabled}
              />
            </FormField>
          ) : null}
        </Stack>
      ) : (
        <Text variant="caption" color="muted">
          Pay and payment details are hidden for your login.
        </Text>
      )}
    </Stack>
  );
}
