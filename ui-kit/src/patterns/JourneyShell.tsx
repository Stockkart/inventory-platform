import type { ReactNode } from 'react';
import { cn } from '../utils/cn';
import { Box } from '../layout/Box';
import { Stack } from '../layout/Stack';
import styles from './JourneyShell.module.css';

export type JourneyShellProps = {
  children: ReactNode;
  /** Fixed marketing/auth header offset (default true). */
  withHeaderOffset?: boolean;
  className?: string;
};

/** Full-viewport auth/onboarding shell under a fixed JourneyHeader. */
export function JourneyShell({ children, withHeaderOffset = true, className }: JourneyShellProps) {
  return (
    <Stack
      minHeight="screen"
      bg="canvas"
      className={cn(withHeaderOffset && styles.withHeaderOffset, className)}
    >
      {children}
    </Stack>
  );
}

export type JourneyMainProps = {
  children: ReactNode;
  className?: string;
};

export function JourneyMain({ children, className }: JourneyMainProps) {
  return (
    <Box
      as="main"
      display="flex"
      flex="1"
      align="center"
      justify="center"
      padding="lg"
      className={cn(styles.authMain, className)}
    >
      {children}
    </Box>
  );
}

export const journeyChrome = {
  header: styles.header,
  logo: styles.logo,
  logoSm: styles.logoSm,
  stepMuted: styles.stepMuted,
  onboardingLayout: styles.onboardingLayout,
  onboardingSidebar: styles.onboardingSidebar,
  onboardingSidebarCompact: styles.onboardingSidebarCompact,
  onboardingProfile: styles.onboardingProfile,
  onboardingUserName: styles.onboardingUserName,
  onboardingSidebarTitle: styles.onboardingSidebarTitle,
  onboardingProgressMeta: styles.onboardingProgressMeta,
  onboardingProgressTrack: styles.onboardingProgressTrack,
  onboardingProgressFill: styles.onboardingProgressFill,
  onboardingStepList: styles.onboardingStepList,
  onboardingStep: styles.onboardingStep,
  onboardingStepActive: styles.onboardingStepActive,
  onboardingStepDone: styles.onboardingStepDone,
  onboardingStepIndex: styles.onboardingStepIndex,
  onboardingStepLabel: styles.onboardingStepLabel,
  onboardingSidebarFooter: styles.onboardingSidebarFooter,
  onboardingMain: styles.onboardingMain,
  onboardingMainInner: styles.onboardingMainInner,
  onboardingBack: styles.onboardingBack,
  onboardingPanel: styles.onboardingPanel,
  onboardingPanelBody: styles.onboardingPanelBody,
  onboardingPanelHeader: styles.onboardingPanelHeader,
  onboardingPanelTitle: styles.onboardingPanelTitle,
  onboardingPanelSubtitle: styles.onboardingPanelSubtitle,
  onboardingForm: styles.onboardingForm,
  onboardingContinue: styles.onboardingContinue,
  onboardingShopTypeBtn: styles.onboardingShopTypeBtn,
  onboardingShopTypeBtnActive: styles.onboardingShopTypeBtnActive,
  authShell: styles.authShell,
  authCard: styles.authCard,
  authCardBody: styles.authCardBody,
  authHeader: styles.authHeader,
  authEyebrow: styles.authEyebrow,
  authTitle: styles.authTitle,
  authSubtitle: styles.authSubtitle,
  authForm: styles.authForm,
  authMetaRow: styles.authMetaRow,
  authMetaLink: styles.authMetaLink,
  authSubmit: styles.authSubmit,
  authFooter: styles.authFooter,
} as const;
