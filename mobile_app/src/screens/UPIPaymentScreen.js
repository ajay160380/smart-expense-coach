import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, TouchableOpacity, Modal, 
  TextInput, Linking, AppState, ActivityIndicator, Platform, Alert,
  Animated, Easing
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as IntentLauncher from 'expo-intent-launcher';

export default function UPIPaymentScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [upiData, setUpiData] = useState(null); // { pa, pn }
  const [rawUpiUrl, setRawUpiUrl] = useState('');
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomValue, setZoomValue] = useState(0);
  const isFocused = useIsFocused();
  
  const appState = useRef(AppState.currentState);
  const paymentStarted = useRef(false);
  
  // Scanner Animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start scanning animation loop
    const startScanAnimation = () => {
      scanLineAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 260, // height of scan frame
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ])
      ).start();
    };
    
    startScanAnimation();
  }, []);

  // Reset state when screen is focused (handles returning to screen)
  useEffect(() => {
    if (isFocused) {
      setScanned(false);
      setShowAmountModal(false);
      setAmount('');
      setIsProcessing(false);
    }
  }, [isFocused]);

  useEffect(() => {
    // Listen for app state changes to detect return from UPI app
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (paymentStarted.current) {
          // Returned from UPI app
          paymentStarted.current = false;
          setIsProcessing(false);
          
          Alert.alert(
            'Payment Status',
            `Did you complete the payment to ${upiData?.pn || 'this person'}?`,
            [
              {
                text: 'No',
                style: 'cancel',
                onPress: () => {
                  setScanned(false);
                  setShowAmountModal(false);
                }
              },
              {
                text: 'Yes, Add Expense',
                onPress: () => {
                  setShowAmountModal(false);
                  setScanned(false);
                  navigation.navigate('Home', {
                    screen: 'AddExpense',
                    params: {
                      prefillAmount: amount || '',
                      prefillDescription: `Paid to ${upiData?.pn || upiData?.pa || 'Merchant'}`
                    }
                  });
                }
              }
            ]
          );
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [navigation, amount, upiData]);

  if (!permission) {
    return <View style={styles.container}><ActivityIndicator color="#A888FF" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera to scan QR codes.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    
    // Provide premium haptic feedback when code is scanned
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Basic UPI URI parsing (upi://pay?pa=...&pn=...)
    if (data.startsWith('upi://pay')) {
      const urlParams = new URLSearchParams(data.split('?')[1]);
      const pa = urlParams.get('pa'); // Payee VPA
      const pn = urlParams.get('pn'); // Payee Name
      
      if (pa) {
        setUpiData({ pa, pn: pn || pa });
        setRawUpiUrl(data); // Save raw URL to preserve merchant codes (mc, tr)
        setShowAmountModal(true);
      } else {
        Alert.alert('Invalid', 'Invalid UPI QR Code', [
          { text: 'OK', onPress: () => setTimeout(() => setScanned(false), 1000) }
        ]);
      }
    } else {
      Alert.alert('Not UPI', 'This is not a valid UPI QR Code', [
        { text: 'OK', onPress: () => setTimeout(() => setScanned(false), 1000) }
      ]);
    }
  };

  const handlePay = (appName = 'default') => {
    if (isProcessing) return; // Prevent double-clicks

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);
    paymentStarted.current = true;
    
    // Auto-reset processing state in case Intent fails to launch quickly
    const resetTimeout = setTimeout(() => {
      setIsProcessing(false);
    }, 4000);
    
    // Determine if it's a Merchant QR
    // A QR is a merchant if it has an 'mc' parameter and it's not '0000'
    const mcMatch = rawUpiUrl.match(/[?&]mc=([^&]+)/);
    const isMerchant = mcMatch && mcMatch[1] !== '0000';

    let finalUpiUrl = rawUpiUrl;

    // Phase 1: Add cu=INR if missing
    if (!finalUpiUrl.includes('cu=')) {
      finalUpiUrl += (finalUpiUrl.includes('?') ? '&' : '?') + 'cu=INR';
    }

    if (isMerchant) {
      // Merchant QR: Safe to pre-fill amount
      const formattedAmount = parseFloat(amount).toFixed(2);
      if (finalUpiUrl.includes('am=')) {
        finalUpiUrl = finalUpiUrl.replace(/([?&])am=[^&]+/, `$1am=${formattedAmount}`);
      } else {
        finalUpiUrl += `&am=${formattedAmount}`;
      }
      
      // Add fresh TR
      finalUpiUrl = finalUpiUrl.replace(/([?&])tr=[^&]+(&|$)/, (match, p1, p2) => p2 === '&' ? p1 : '');
      finalUpiUrl = finalUpiUrl.replace(/[?&]$/, '');
      finalUpiUrl += `&tr=TXN${Date.now()}`;
      // Add fake TN if missing
      if (!finalUpiUrl.includes('tn=')) {
        finalUpiUrl += `&tn=Payment`;
      }
    } else {
      // Personal (P2P) QR: Strictly remove 'am' parameter to avoid NPCI Risk Engine blocks
      finalUpiUrl = finalUpiUrl.replace(/([?&])am=[^&]+(&|$)/, (match, p1, p2) => {
        return p2 === '&' ? p1 : '';
      });
      // Remove trailing '&' or '?' if left over
      finalUpiUrl = finalUpiUrl.replace(/[?&]$/, '');
      
      // Smart Spoofing: Add mode=02 (Secure QR Code) and purpose=00 to trick GPay risk engine
      if (!finalUpiUrl.includes('mode=')) {
        finalUpiUrl += `&mode=02`;
      }
      if (!finalUpiUrl.includes('purpose=')) {
        finalUpiUrl += `&purpose=00`;
      }
    }

    // Safely encode 'pn' (payee name) using standard encodeURIComponent
    finalUpiUrl = finalUpiUrl.replace(/([?&])pn=([^&]+)/, (match, p1, p2) => {
      try {
        return `${p1}pn=${encodeURIComponent(decodeURIComponent(p2))}`;
      } catch {
        return `${p1}pn=${encodeURIComponent(p2)}`;
      }
    });

    // Replace scheme based on selected app
    let upiUrl = finalUpiUrl;
    
    if (appName === 'gpay') {
      upiUrl = upiUrl.replace('upi://pay', 'tez://upi/pay');
    } else if (appName === 'phonepe') {
      upiUrl = upiUrl.replace('upi://pay', 'phonepe://pay');
    } else if (appName === 'paytm') {
      upiUrl = upiUrl.replace('upi://pay', 'paytmmp://pay');
    }
    
    paymentStarted.current = true;
    
    const handleLaunchFailure = (name, timeout) => {
      clearTimeout(timeout);
      paymentStarted.current = false;
      setIsProcessing(false);
      Alert.alert(
        'App Not Found', 
        `Could not launch ${name.toUpperCase()}. Please ensure it is installed.`
      );
    };

    Linking.openURL(upiUrl).then(() => {
      // Intent launched successfully! The AppState listener will handle their return.
      clearTimeout(resetTimeout);
    }).catch(err => {
      // Phase 2: Scheme fallback to generic upi://pay
      if (appName !== 'default' && upiUrl !== finalUpiUrl) {
        Linking.openURL(finalUpiUrl).then(() => {
          clearTimeout(resetTimeout);
        }).catch(() => {
          handleLaunchFailure(appName, resetTimeout);
        });
      } else {
        handleLaunchFailure(appName, resetTimeout);
      }
    });
  };

  const openAppViaDeepLink = async (schemeUrl, appName) => {
    try {
      paymentStarted.current = true;
      await Linking.openURL(schemeUrl);
    } catch (e) {
      paymentStarted.current = false;
      alert(`${appName} is not installed or cannot be opened automatically.`);
    }
  };

  const handleCopyAndPay = async () => {
    if (upiData?.pa) {
      await Clipboard.setStringAsync(upiData.pa);
      Alert.alert(
        'UPI ID Copied! ✅',
        `The UPI ID (${upiData.pa}) has been copied to your clipboard.\n\nOpen your app below and paste it to pay.`,
        [
          { text: 'GPay', onPress: () => openAppViaDeepLink('tez://upi/pay', 'GPay') },
          { text: 'PhonePe', onPress: () => openAppViaDeepLink('phonepe://pay', 'PhonePe') },
          { text: 'Paytm', onPress: () => openAppViaDeepLink('paytmmp://pay', 'Paytm') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const closeModal = () => {
    setShowAmountModal(false);
    setScanned(false);
  };

  const mcMatch = rawUpiUrl.match(/[?&]mc=([^&]+)/);
  const isMerchant = mcMatch && mcMatch[1] !== '0000';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan to Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Camera takes the full remaining space */}
      <View style={styles.cameraArea}>
        <CameraView
          style={{ width: '100%', height: '100%' }}
          facing="back"
          enableTorch={isTorchOn}
          zoom={zoomValue}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
        />
        
        {/* Transparent overlay with just the scan frame */}
        <View style={styles.overlayCenter} pointerEvents="box-none">
          <View style={styles.scanFrame}>
            {/* Animated Scanning Line */}
            {!showAmountModal && (
              <Animated.View 
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineAnim }] }
                ]} 
              />
            )}
            
            {/* Corner accents */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanText}>Align QR code within the frame</Text>
        </View>
      </View>

      {/* Controls bar at the bottom */}
      <View style={styles.controlsBar}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setZoomValue(prev => Math.max(prev - 0.1, 0))}>
          <Ionicons name="remove-outline" size={26} color="#fff" />
          <Text style={styles.controlLabel}>Zoom -</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlBtn, styles.torchBtn, isTorchOn && styles.torchBtnActive]} 
          onPress={() => setIsTorchOn(!isTorchOn)}
        >
          <Ionicons name={isTorchOn ? "flash" : "flash-outline"} size={26} color={isTorchOn ? "#0f1520" : "#fff"} />
          <Text style={[styles.controlLabel, isTorchOn && { color: '#0f1520' }]}>Light</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlBtn} onPress={() => setZoomValue(prev => Math.min(prev + 0.1, 1))}>
          <Ionicons name="add-outline" size={26} color="#fff" />
          <Text style={styles.controlLabel}>Zoom +</Text>
        </TouchableOpacity>
      </View>

      {/* Amount Modal */}
      <Modal visible={showAmountModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <LinearGradient 
            colors={['#1A1F2D', '#0B0E14']}
            style={styles.modalContent}
          >
            <View style={styles.modalDragIndicator} />
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={closeModal}
            >
              <Ionicons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>

            <Text style={styles.payingText}>Paying to</Text>
            <Text style={styles.merchantName}>{upiData?.pn}</Text>
            <Text style={styles.merchantUpi}>{upiData?.pa}</Text>

            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="numeric"
                autoFocus={true}
                placeholder="0"
                placeholderTextColor="#666"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={{color: '#94A3B8', textAlign: 'center', marginBottom: 15, fontSize: 14}}>
                {isProcessing ? 'Processing...' : 'Choose app to pay'}
              </Text>
              
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20}}>
                <TouchableOpacity 
                  style={styles.appBtn} 
                  onPress={() => handlePay('gpay')}
                  disabled={isProcessing}
                >
                  <Text style={styles.appBtnText}>GPay</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.appBtn} 
                  onPress={() => handlePay('phonepe')}
                  disabled={isProcessing}
                >
                  <Text style={styles.appBtnText}>PhonePe</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.appBtn} 
                  onPress={() => handlePay('paytm')}
                  disabled={isProcessing}
                >
                  <Text style={styles.appBtnText}>Paytm</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.appBtn} 
                  onPress={() => handlePay('default')}
                  disabled={isProcessing}
                >
                  <Text style={styles.appBtnText}>Other</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.disclaimerText}>
                {isMerchant 
                  ? "Note: Secure Merchant Payment."
                  : "Agar payment app mein 'Limit Exceeded' ya 'Risk Policy' error aaye, ye is app ki taraf se fix nahi ho sakta — pehli baar kisi naye payee ko third-party app se pay karna aksar bank/UPI app dwara block kiya jaata hai. Try a saved/frequent payee, or wait a few hours and retry."
                }
              </Text>

              {/* FALLBACK BUTTON FOR COPY-PASTE (ONLY FOR PERSONAL QRS) */}
              {!isMerchant && (
                <TouchableOpacity 
                  style={styles.copyFallbackBtn} 
                  onPress={handleCopyAndPay}
                >
                  <Ionicons name="copy-outline" size={18} color="#A888FF" />
                  <Text style={styles.copyFallbackText}>Failing? Copy UPI ID & Pay Manually</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#0f1520',
    zIndex: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  cameraArea: {
    flex: 1,
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: 'rgba(168, 136, 255, 0.4)',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden', // Contain the scanning line
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 3,
    backgroundColor: '#A888FF',
    shadowColor: '#A888FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#A888FF',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  scanText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 24,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#0f1520',
  },
  controlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  controlLabel: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 2,
  },
  torchBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  torchBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#A888FF',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    minHeight: 420,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#A888FF',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  payingText: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  merchantName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
  },
  merchantUpi: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
    marginBottom: 35,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 24,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(168, 136, 255, 0.2)',
  },
  currencySymbol: {
    color: '#A888FF',
    fontSize: 42,
    fontWeight: '300',
    marginRight: 12,
  },
  amountInput: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '600',
    minWidth: 100,
    letterSpacing: 2,
  },
  appBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 136, 255, 0.2)',
  },
  appBtnText: {
    color: '#A888FF',
    fontSize: 13,
    fontWeight: '600',
  },
  disclaimerText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  copyFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(168, 136, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 136, 255, 0.3)',
    borderStyle: 'dashed',
  },
  copyFallbackText: {
    color: '#A888FF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 8,
  }
});
