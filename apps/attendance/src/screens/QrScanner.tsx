/**
 * The QR half of the pairing screen (R2.6): `expo-camera`'s `CameraView` limited to QR codes.
 * Asks for the camera permission on first use; when it is denied the worker still has the
 * 8-character field, so the scanner only ever offers "Allow camera" and never blocks the flow.
 *
 * `onScanned` receives the raw payload (`https://stockkart.in/attendance/pair#<CODE>` or the bare
 * code); the parent decides what it holds. Repeated frames of the same QR are throttled here so
 * one scan produces one call.
 */
import { useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { BigButton } from './PairingWidgets';

interface QrScannerProps {
  onScanned: (payload: string) => void;
  /** While true the camera keeps running but scans are ignored (a request is in flight). */
  paused?: boolean;
}

/** Minimum gap between two scan callbacks; the camera reports the same QR many times a second. */
const SCAN_GAP_MS = 1500;

export function QrScanner({ onScanned, paused = false }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanAt = useRef(0);

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (paused) {
        return;
      }
      const now = Date.now();
      if (now - lastScanAt.current < SCAN_GAP_MS) {
        return;
      }
      lastScanAt.current = now;
      onScanned(data);
    },
    [onScanned, paused],
  );

  if (!permission) {
    // Permission state still loading; nothing to show for a moment.
    return <View style={styles.box} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.box, styles.permissionBox]}>
        <Text style={styles.permissionText}>
          Allow the camera to scan the QR code your manager shows you, or type the 8 characters
          below.
        </Text>
        {permission.canAskAgain ? (
          <BigButton
            label="Allow camera"
            variant="secondary"
            onPress={() => {
              void requestPermission();
            }}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.box} testID="qr-scanner">
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  camera: { flex: 1 },
  permissionBox: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    justifyContent: 'center',
    gap: 12,
  },
  permissionText: { fontSize: 16, lineHeight: 22, color: '#1f2937', textAlign: 'center' },
});
