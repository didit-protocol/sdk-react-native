import XCTest
import DiditSDK
@testable import SdkReactNative

/// Hands results built from the pinned DiditSDK to the bridge's delivery path
/// (the one its verification view calls) and reads the dictionary the
/// TurboModule resolves to JS. Every error type must match the string the
/// Android bridge sends for the same native error.
final class DiditSdkBridgeResultTests: XCTestCase {

    func testHostBundlesEnglishAndSpanishLocationPurposes() throws {
        let english = Bundle.main.infoDictionary
        let temporary = english?["NSLocationTemporaryUsageDescriptionDictionary"] as? [String: String]
        let spanishPath = try XCTUnwrap(Bundle.main.path(forResource: "es", ofType: "lproj"))
        let spanish = try XCTUnwrap(Bundle(path: spanishPath))

        XCTAssertEqual(english?["NSLocationWhenInUseUsageDescription"] as? String,
                       "Your location is used to confirm where you are for this verification.")
        XCTAssertEqual(temporary?["DiditLocationVerification"],
                       "This verification needs your precise location once.")
        XCTAssertEqual(spanish.localizedString(forKey: "NSLocationWhenInUseUsageDescription", value: nil, table: "InfoPlist"),
                       "Tu ubicación se usa para confirmar dónde estás en esta verificación.")
        XCTAssertEqual(spanish.localizedString(forKey: "DiditLocationVerification", value: nil, table: "InfoPlist"),
                       "Esta verificación necesita tu ubicación precisa una vez.")
    }

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

    func testCompletedAndCancelledResultsKeepTheSession() {
        let session = SessionData(sessionId: "test-session", status: .pending)
        let completed = deliver(.completed(session: session))
        let cancelled = deliver(.cancelled(session: session))

        XCTAssertEqual(completed["type"] as? String, "completed")
        XCTAssertEqual(cancelled["type"] as? String, "cancelled")
        for result in [completed, cancelled] {
            XCTAssertEqual(result["sessionId"] as? String, "test-session")
            XCTAssertEqual(result["status"] as? String, "Pending")
            XCTAssertNil(result["errorType"])
        }
    }

    func testResultIsDeliveredOnlyOnceForTheCurrentPresentation() {
        let bridge = DiditSdkBridge()
        let stale = bridge.beginPresentation()
        let current = bridge.beginPresentation()
        let delivered = expectation(description: "delivered once")
        delivered.assertForOverFulfill = true

        bridge.deliverResult(.cancelled(session: nil), generation: stale) { _ in
            XCTFail("A stale presentation must not resolve the current callback")
        }
        bridge.deliverResult(.failed(error: .retryBlocked, session: nil), generation: current) { result in
            XCTAssertEqual(result["errorType"] as? String, "retryBlocked")
            XCTAssertNil(result["sessionId"])
            delivered.fulfill()
        }
        bridge.deliverResult(.cancelled(session: nil), generation: current) { _ in
            XCTFail("A duplicate result must not resolve twice")
        }
        wait(for: [delivered], timeout: 5)
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
