import { useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { lookupBarcode } from '@/features/nutrition/foodDatabase';
import { rememberFoodItem } from '@/features/nutrition/foodSearchHooks';
import { errorMessage } from '@/utils/format';
import { haptics } from '@/utils/haptics';

// Grocery barcodes: UPC in North America, EAN elsewhere.
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

type ScanState =
  | { status: 'scanning' }
  | { status: 'looking-up'; barcode: string }
  | { status: 'not-found'; barcode: string }
  | { status: 'error'; message: string };

export default function ScanBarcodeScreen() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>({ status: 'scanning' });
  // The camera reports the same code many times a second; handle it once.
  const handling = useRef(false);

  async function onScanned({ data }: BarcodeScanningResult) {
    if (handling.current) return;
    handling.current = true;
    haptics.success();
    setState({ status: 'looking-up', barcode: data });
    try {
      const item = await lookupBarcode(data);
      if (!item) {
        setState({ status: 'not-found', barcode: data });
        return;
      }
      rememberFoodItem(queryClient, item);
      router.replace({
        pathname: '/food/item',
        params: { key: item.key, meal: params.meal, date: params.date },
      });
    } catch (e) {
      setState({ status: 'error', message: errorMessage(e) });
    }
  }

  function scanAgain() {
    handling.current = false;
    setState({ status: 'scanning' });
  }

  const routeParams = { meal: params.meal, date: params.date };

  if (Platform.OS === 'web') {
    return (
      <Message
        title="Scanning works in the app"
        body="Open Mat Log on your iPhone or Android phone to scan barcodes. On the web, use search instead."
        primary={{ title: 'Back to search', onPress: () => router.back() }}
      />
    );
  }

  if (!permission) {
    return <Message title="Starting camera" loading />;
  }

  if (!permission.granted) {
    return (
      <Message
        title="Camera access needed"
        body="Mat Log uses the camera only to read food barcodes. Nothing is recorded or saved."
        primary={
          permission.canAskAgain
            ? { title: 'Allow camera', onPress: requestPermission }
            : { title: 'Back to search', onPress: () => router.back() }
        }
        footnote={
          permission.canAskAgain ? undefined : 'Turn on camera access for Mat Log in Settings.'
        }
      />
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={state.status === 'scanning' ? onScanned : undefined}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.frame} />
        <View style={styles.panel}>
          {state.status === 'scanning' ? (
            <Text style={styles.panelText}>Line up the barcode inside the frame</Text>
          ) : state.status === 'looking-up' ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.panelText}>Looking up {state.barcode}</Text>
            </View>
          ) : (
            <View style={styles.result}>
              <Text style={styles.panelTitle}>
                {state.status === 'not-found' ? 'Product not found' : 'Lookup failed'}
              </Text>
              <Text style={styles.panelText}>
                {state.status === 'not-found'
                  ? `Barcode ${state.barcode} isn't in Open Food Facts yet. Search for it or add it by hand.`
                  : state.message}
              </Text>
              <View style={styles.row}>
                <Button
                  title="Scan again"
                  variant="secondary"
                  onPress={scanAgain}
                  style={styles.flex}
                />
                <Button
                  title="Quick add"
                  onPress={() => router.replace({ pathname: '/food/quick', params: routeParams })}
                  style={styles.flex}
                />
              </View>
            </View>
          )}
          <Text style={styles.attribution}>Barcode data from Open Food Facts</Text>
        </View>
      </View>
    </View>
  );
}

function Message({
  title,
  body,
  primary,
  footnote,
  loading,
}: {
  title: string;
  body?: string;
  primary?: { title: string; onPress: () => void };
  footnote?: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.message}>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      <Text style={styles.messageTitle}>{title}</Text>
      {body ? <Text style={styles.messageBody}>{body}</Text> : null}
      {primary ? <Button title={primary.title} onPress={primary.onPress} /> : null}
      {footnote ? <Text style={styles.messageBody}>{footnote}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '30%',
    padding: spacing.lg,
  },
  frame: {
    width: '85%',
    aspectRatio: 1.8,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  panel: {
    alignSelf: 'stretch',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(11, 13, 17, 0.88)',
    gap: spacing.sm,
  },
  result: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  panelTitle: {
    fontSize: 17,
    fontFamily: fonts.bold,
    color: colors.text,
  },
  panelText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  attribution: {
    fontSize: 11,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  messageTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 340,
  },
});
