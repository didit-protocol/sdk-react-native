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
  startVerification,
  startVerificationWithWorkflow,
  VerificationStatus,
  type VerificationResult,
} from '@didit-protocol/sdk-react-native';

export default function App() {
  const [token, setToken] = useState('');
  const [workflowId, setWorkflowId] = useState('');
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
          config: { loggingEnabled: true },
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
});
