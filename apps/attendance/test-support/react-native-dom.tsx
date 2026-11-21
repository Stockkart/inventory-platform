/**
 * `react-native` as plain DOM elements, for screen tests under vitest + jsdom. `vite.config.mts`
 * aliases `react-native` to this file in the test run only; Metro never sees it.
 *
 * The real `react-native` package cannot load in node (Flow syntax, native modules), and a React
 * Native renderer would need Jest's preset. This stub keeps the test surface small on purpose: a
 * screen's structure, texts and taps are what the tests assert, not layout. `View` → `div`,
 * `Text` → `span`, `Pressable` → `button`, `ScrollView` → `div`, `TextInput` → `input`; `style`
 * props are dropped; accessibility props are mapped so `getByRole` / `getByLabelText` work.
 */
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';

type AnyProps = PropsWithChildren<Record<string, unknown>>;

function domProps(props: AnyProps): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof props.testID === 'string') {
    out['data-testid'] = props.testID;
  }
  if (typeof props.accessibilityLabel === 'string') {
    out['aria-label'] = props.accessibilityLabel;
  }
  if (typeof props.accessibilityRole === 'string') {
    out['role'] = props.accessibilityRole === 'header' ? 'heading' : props.accessibilityRole;
  }
  return out;
}

export function View(props: AnyProps) {
  return <div {...domProps(props)}>{props.children as ReactNode}</div>;
}

export function ScrollView(props: AnyProps) {
  return <div {...domProps(props)}>{props.children as ReactNode}</div>;
}

export function Text(props: AnyProps) {
  return <span {...domProps(props)}>{props.children as ReactNode}</span>;
}

export function ActivityIndicator(props: AnyProps) {
  return <progress {...domProps(props)} />;
}

export function Pressable(props: AnyProps) {
  const { onPress, disabled } = props as { onPress?: () => void; disabled?: boolean };
  const dom = domProps(props);
  // A DOM <button> already has role=button; a `link` role on a button confuses nothing in tests.
  return (
    <button type="button" {...dom} disabled={disabled === true} onClick={() => onPress?.()}>
      {props.children as ReactNode}
    </button>
  );
}

export function TextInput(props: AnyProps) {
  const { value, placeholder, maxLength, editable, onChangeText, onSubmitEditing } = props as {
    value?: string;
    placeholder?: string;
    maxLength?: number;
    editable?: boolean;
    onChangeText?: (text: string) => void;
    onSubmitEditing?: () => void;
  };
  return (
    <input
      type="text"
      {...domProps(props)}
      value={value ?? ''}
      placeholder={placeholder}
      maxLength={maxLength}
      disabled={editable === false}
      onChange={(event) => onChangeText?.(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onSubmitEditing?.();
        }
      }}
    />
  );
}

export const StyleSheet = {
  create<T extends Record<string, CSSProperties | Record<string, unknown>>>(styles: T): T {
    return styles;
  },
  flatten(style: unknown): unknown {
    return style;
  },
  hairlineWidth: 1,
};

export const Platform = {
  OS: 'android' as const,
  Version: 28,
  select<T>(spec: { android?: T; ios?: T; default?: T }): T | undefined {
    return spec.android ?? spec.default;
  },
};
