import XCTest
import DiditSDK
@testable import SdkReactNative

/// Hands results built from the pinned DiditSDK to the bridge's delivery path
/// (the one its verification view calls) and reads the dictionary the
/// TurboModule resolves to JS. Every error type must match the string the
/// Android bridge sends for the same native error.
final class DiditSdkBridgeResultTests: XCTestCase {

    func testRetryBlockedReachesJavaScriptAsRetryBlocked() {
        let result = deliver(
            .failed(
                error: .retryBlocked,
                session: SessionData(sessionId: "test-session", status: .declined)
            )
        )

        XCTAssertEqual(result["type"] as? String, "failed")
        XCTAssertEqual(result["errorType"] as? String, "retryBlocked")
        XCTAssertEqual(result["sessionId"] as? String, "test-session")
        XCTAssertEqual(result["status"] as? String, "Declined")
    }

    func testEveryNativeErrorKeepsTheAndroidErrorType() {
        let expected: [(VerificationError, String)] = [
            (.sessionExpired, "sessionExpired"),
            (.retryBlocked, "retryBlocked"),
            (.networkError, "networkError"),
            (.cameraAccessDenied, "cameraAccessDenied"),
            (.unknown("native message"), "unknown"),
        ]

        for (error, errorType) in expected {
            let result = deliver(.failed(error: error, session: nil))

            XCTAssertEqual(result["errorType"] as? String, errorType, "\(error)")
            XCTAssertEqual(result["errorMessage"] as? String, error.localizedDescription, "\(error)")
        }
    }

    /// Starts a presentation, hands it one native result and waits for what
    /// the bridge resolves.
    private func deliver(_ result: VerificationResult) -> NSDictionary {
        let bridge = DiditSdkBridge()
        let resolved = Resolved()
        let delivered = expectation(description: "result delivered")

        bridge.deliverResult(result, generation: bridge.beginPresentation()) { dictionary in
            resolved.dictionary = dictionary
            delivered.fulfill()
        }

        wait(for: [delivered], timeout: 5)
        return resolved.dictionary
    }
}

private final class Resolved: @unchecked Sendable {
    var dictionary: NSDictionary = [:]
}
