// Tokens
export * from './tokens';

// Theme
export {
  ThemeProvider,
  ThemeToggle,
  useTheme,
  type Theme,
  type ThemeMode,
  type ThemeContextValue,
} from './theme';

// Layout — Layer 1
export {
  Box,
  Stack,
  Inline,
  Grid,
  Text,
  Divider,
  Spacer,
  VisuallyHidden,
  type BoxProps,
  type StackProps,
  type GridProps,
  type TextProps,
  type DividerProps,
  type SpacerProps,
} from './layout';

// Forms — Layer 2
export {
  Button,
  IconButton,
  Link,
  Input,
  Textarea,
  Select,
  Label,
  Checkbox,
  RadioGroup,
  Switch,
  FormField,
  FormRow,
  type ButtonProps,
  type IconButtonProps,
  type LinkProps,
  type InputProps,
  type TextareaProps,
  type SelectProps,
  type LabelProps,
  type CheckboxProps,
  type RadioGroupProps,
  type SwitchProps,
  type FormFieldProps,
  type LegacyFormFieldProps,
  type FormFieldWrapperProps,
} from './forms';

// Feedback — Layer 3
export {
  Spinner,
  Badge,
  Tag,
  Avatar,
  Skeleton,
  Alert,
  Toast,
  ProgressBar,
  type SpinnerProps,
  type BadgeProps,
  type TagProps,
  type AvatarProps,
  type SkeletonProps,
  type AlertProps,
  type ToastProps,
  type ProgressBarProps,
} from './feedback';

// Overlay — Layer 4
export {
  Modal,
  Drawer,
  Popover,
  Tooltip,
  DropdownMenu,
  type ModalProps,
  type DrawerProps,
  type PopoverProps,
  type TooltipProps,
  type DropdownMenuProps,
} from './overlay';

// Data display — Layer 5
export {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  TableLoadingRow,
  TableEmptyRow,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Tabs,
  type TabsProps,
} from './data-display';

// Patterns — Layer 6
export {
  PaginationBar,
  EmptyState,
  PageHeader,
  SearchInput,
  ConfirmDialog,
  EditModal,
  type PaginationBarProps,
  type EmptyStateProps,
  type PageHeaderProps,
  type SearchInputProps,
  type ConfirmDialogProps,
  type EditModalProps,
} from './patterns';

// Icons
export { Icon, type IconProps } from './icons';

// Utils / types
export { cn } from './utils/cn';
export type {
  UiSize,
  ButtonVariant,
  TextVariant,
  TextColor,
  AlertVariant,
  BadgeVariant,
  SpacingScale,
} from './utils/types';
