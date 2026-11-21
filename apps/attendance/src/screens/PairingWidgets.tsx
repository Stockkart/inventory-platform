/**
 * The few React Native widgets the pairing screens share: a full-width button, a notice box and
 * the screen frame. Plain `react-native` primitives only; the app cannot load ui-kit
 * (`eslint.config.mjs`, Boundaries). Kept next to the screens that use them.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface BigButtonProps {
  label: string;
  onPress: () => void;
  /** `secondary` is the outlined "No" / "Don't agree" style. */
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  testID?: string;
}

/** A button that fills the row; the only tappable control style on these screens. */
export function BigButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  testID,
}: BigButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.buttonSecondary : styles.buttonPrimary,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary' ? styles.buttonLabelSecondary : styles.buttonLabelPrimary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface NoticeBoxProps {
  message: string;
  tone?: 'info' | 'error';
}

/** One message the worker must read, shown word for word (R2.14, R4.3). */
export function NoticeBox({ message, tone = 'error' }: NoticeBoxProps) {
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, tone === 'error' ? styles.noticeError : styles.noticeInfo]}
    >
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

interface ScreenFrameProps {
  title: string;
  children: ReactNode;
  busy?: boolean;
}

/** Title, scrollable body and an optional spinner overlay while a request is in flight. */
export function ScreenFrame({ title, children, busy = false }: ScreenFrameProps) {
  return (
    <View style={styles.frame}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        testID="screen-body"
      >
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {children}
      </ScrollView>
      {busy ? (
        <View style={styles.busyOverlay} testID="busy">
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : null}
    </View>
  );
}

/** A heading followed by one plain sentence per line (the consent lists, R2.8). */
export function SentenceList({ heading, sentences }: { heading: string; sentences: string[] }) {
  return (
    <View style={styles.list}>
      <Text accessibilityRole="header" style={styles.listHeading}>
        {heading}
      </Text>
      {sentences.map((sentence) => (
        <Text key={sentence} style={styles.listItem}>
          {`\u2022 ${sentence}`}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: '#ffffff' },
  body: { padding: 24, gap: 16, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '600', color: '#111827' },
  button: {
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: '#1d4ed8' },
  buttonSecondary: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#1d4ed8' },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonLabel: { fontSize: 18, fontWeight: '600' },
  buttonLabelPrimary: { color: '#ffffff' },
  buttonLabelSecondary: { color: '#1d4ed8' },
  notice: { borderRadius: 12, padding: 16 },
  noticeError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  noticeInfo: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#93c5fd' },
  noticeText: { fontSize: 16, lineHeight: 22, color: '#111827' },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  list: { gap: 6 },
  listHeading: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 4 },
  listItem: { fontSize: 16, lineHeight: 22, color: '#1f2937' },
});
