import { useRef, useState, useCallback } from 'react';
import { View, Modal, StyleSheet, ActivityIndicator, Platform, Linking, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { COLORS } from '@/lib/theme';

export type RazorpayCheckoutParams = {
  key_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name?: string; email?: string; contact?: string };
};

export type RazorpayResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type Props = {
  visible: boolean;
  params: RazorpayCheckoutParams | null;
  onSuccess: (result: RazorpayResult) => void;
  onError: (error: string) => void;
  onClose: () => void;
};

const CHECKOUT_HTML = (params: RazorpayCheckoutParams) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    body { margin: 0; padding: 0; background: #0A0A0B; font-family: -apple-system, sans-serif; }
    #loading { display: flex; align-items: center; justify-content: center; height: 100vh; color: #E0B252; }
    .spinner { width: 40px; height: 40px; border: 3px solid rgba(224,178,82,0.2); border-top-color: #E0B252; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div id="loading"><div class="spinner"></div></div>
  <script>
    (function() {
      var params = ${JSON.stringify(params)};
      var options = {
        key: params.key_id,
        order_id: params.razorpay_order_id,
        amount: params.amount,
        currency: params.currency,
        name: params.name,
        description: params.description,
        prefill: params.prefill,
        theme: { color: '#0A0A0B' },
        modal: {
          ondismiss: function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ error: 'Payment cancelled by user' }));
          }
        },
        handler: function(response) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature
          }));
        }
      };
      var rzp = new Razorpay(options);
      rzp.on('payment.failed', function(resp) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          error: resp.error.description || 'Payment failed',
          code: resp.error.code
        }));
      });
      rzp.open();
    })();
  </script>
</body>
</html>
`;

export function RazorpayCheckout({ visible, params, onSuccess, onError, onClose }: Props) {
  const webviewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.error) {
        onError(data.error);
      } else {
        onSuccess({
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
        });
      }
    } catch {
      onError('Invalid payment response');
    }
  }, [onSuccess, onError]);

  const handleNavigation = useCallback((nav: WebViewNavigation) => {
    if (nav.url.startsWith('upi://')) {
      if (Platform.OS !== 'web') {
        Linking.openURL(nav.url).catch(() => {
          Alert.alert('Error', 'No UPI app found. Please install a UPI app like Google Pay or PhonePe.');
        });
      }
      return false;
    }
    return true;
  }, []);

  if (!params) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.gold} />
          </View>
        )}
        <WebView
          ref={webviewRef}
          source={{ html: CHECKOUT_HTML(params) }}
          onMessage={handleMessage}
          onNavigationStateChange={handleNavigation}
          onLoadEnd={() => setLoading(false)}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['https://*', 'upi://*']}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  webview: { flex: 1, backgroundColor: COLORS.black },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.black, zIndex: 10 },
});
