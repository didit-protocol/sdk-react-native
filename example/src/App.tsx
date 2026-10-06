import { useState, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  CameraLens,
  startVerification,
  startVerificationWithWorkflow,
  submitTransaction,
  DiditTransactionError,
  VerificationStatus,
  type VerificationResult,
  type DiditTransactionResult,
} from '@didit-protocol/sdk-react-native';

const DEMO_WALLET_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export default function App() {
  const [token, setToken] = useState('e5xD6RVXV19Q');
  const [workflowId, setWorkflowId] = useState('');
  const [transactionToken, setTransactionToken] = useState('');
  const [transactionResult, setTransactionResult] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const handleStartWithToken = useCallback(async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter a session token.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const verificationResult = await startVerification(token.trim(), {
        loggingEnabled: true,
        defaultDocumentCamera: CameraLens.Back,
        defaultLivenessCamera: CameraLens.Front,
        showDocumentCameraSwitchButton: true,
        showLivenessCameraSwitchButton: true,
      });
      setResult(verificationResult);
      showResultAlert(verificationResult);
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleStartWithWorkflow = useCallback(async () => {
    if (!workflowId.trim()) {
      Alert.alert('Error', 'Please enter a workflow ID.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const verificationResult = await startVerificationWithWorkflow(
        workflowId.trim(),
        {
          config: {
            loggingEnabled: true,
            defaultDocumentCamera: CameraLens.Back,
            defaultLivenessCamera: CameraLens.Front,
            showDocumentCameraSwitchButton: true,
            showLivenessCameraSwitchButton: true,
          },
        }
      );
      setResult(verificationResult);
      showResultAlert(verificationResult);
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  const handleSubmitTransaction = useCallback(async () => {
    if (!transactionToken.trim()) {
      Alert.alert('Error', 'Please enter a transaction SDK token.');
      return;
    }

    setLoading(true);
    setTransactionResult(null);

    try {
      const txn = await submitTransaction(
        transactionToken.trim(),
        {
          txnId: `rn-demo-${Date.now()}`,
          txnDate: new Date().toISOString(),
          type: 'crypto',
          info: {
            direction: 'outbound',
            amount: 0.25,
            currency: 'ETH',
            currencyType: 'crypto',
            cryptoParams: { address: DEMO_WALLET_ADDRESS, chain: 'ethereum' },
          },
          subject: {
            type: 'individual',
            externalUserId: 'rn-demo-user',
            fullName: 'Ada Lovelace',
          },
          counterparty: {
            type: 'individual',
            fullName: 'Charles Babbage',
            paymentMethod: {
              type: 'crypto',
              accountId: DEMO_WALLET_ADDRESS,
              issuingCountry: 'GB',
            },
          },
          travelRule: {
            required: true,
            originatorData: { full_name: 'Ada Lovelace' },
            beneficiaryData: {
              full_name: 'Charles Babbage',
              wallet_address: DEMO_WALLET_ADDRESS,
            },
          },
          includeCryptoScreening: true,
        },
        {
          onTransactionUpdated: (updated: DiditTransactionResult) => {
            setTransactionResult(
              `Updated after action:\n${JSON.stringify(updated, null, 2)}`
            );
          },
        }
      );
      setTransactionResult(JSON.stringify(txn, null, 2));
    } catch (error) {
      if (error instanceof DiditTransactionError) {
        setTransactionResult(
          `Error (${error.code}): ${error.message}` +
            (error.fieldErrors
              ? `\n${JSON.stringify(error.fieldErrors, null, 2)}`
              : '')
        );
      } else {
        setTransactionResult(`Unexpected error: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  }, [transactionToken]);

  const showResultAlert = (res: VerificationResult) => {
    switch (res.type) {
      case 'completed':
        Alert.alert(
          'Verification Complete',
          `Status: ${res.session.status}\nSession ID: ${res.session.sessionId}`
        );
        break;
      case 'cancelled':
        Alert.alert('Verification Cancelled', 'The user cancelled the flow.');
        break;
      case 'failed':
        Alert.alert(
          'Verification Failed',
          `Error: ${res.error.type}\n${res.error.message}`
        );
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Didit SDK Example</Text>
        <Text style={styles.subtitle}>Identity Verification</Text>

        {/* Token-based verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start with Session Token</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter session token..."
            placeholderTextColor="#999"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleStartWithToken}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start Verification</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Workflow-based verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start with Workflow ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter workflow ID..."
            placeholderTextColor="#999"
            value={workflowId}
            onChangeText={setWorkflowId}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleStartWithWorkflow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start with Workflow</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Transaction submission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submit Sample Transaction</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter transaction SDK token..."
            placeholderTextColor="#999"
            value={transactionToken}
            onChangeText={setTransactionToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSubmitTransaction}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Submit Travel-Rule Transaction
              </Text>
            )}
          </TouchableOpacity>
          {transactionResult && (
            <View style={[styles.resultCard, styles.transactionResultCard]}>
              <Text style={styles.transactionResultText}>
                {transactionResult}
              </Text>
            </View>
          )}
        </View>

        {/* Result display */}
        {result && (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Last Result</Text>
            <View style={styles.resultCard}>
              <Text style={styles.resultType}>
                Type: <Text style={styles.resultValue}>{result.type}</Text>
              </Text>
              {result.type === 'completed' && (
                <>
                  <Text style={styles.resultType}>
                    Status:{' '}
                    <Text
                      style={[
                        styles.resultValue,
                        result.session.status === VerificationStatus.Approved &&
                          styles.statusApproved,
                        result.session.status === VerificationStatus.Declined &&
                          styles.statusDeclined,
                      ]}
                    >
                      {result.session.status}
                    </Text>
                  </Text>
                  <Text style={styles.resultType}>
                    Session:{' '}
                    <Text style={styles.resultValue}>
                      {result.session.sessionId}
                    </Text>
                  </Text>
                </>
              )}
              {result.type === 'failed' && (
                <Text style={styles.resultType}>
                  Error:{' '}
                  <Text style={styles.resultValue}>
                    {result.error.type} - {result.error.message}
                  </Text>
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#4a4a4a',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSection: {
    marginTop: 8,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  resultType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultValue: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusApproved: {
    color: '#059669',
  },
  statusDeclined: {
    color: '#dc2626',
  },
  transactionResultCard: {
    marginTop: 12,
  },
  transactionResultText: {
    fontSize: 12,
    color: '#1a1a1a',
    fontFamily: 'Courier',
  },
});
