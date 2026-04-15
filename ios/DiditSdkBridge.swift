import UIKit
import SwiftUI
@preconcurrency import DiditSDK

// MARK: - Swift Bridge for React Native TurboModule

/// Bridge class that exposes DiditSDK functionality to Objective-C++.
/// This is the adapter between the ObjC++ TurboModule and the Swift DiditSDK.
@objcMembers
public class DiditSdkBridge: NSObject, @unchecked Sendable {

    private var hostingController: UIViewController?

    // MARK: - Start Verification with Token

    /// Start verification using an existing session token.
    /// - Parameters:
    ///   - token: Session token from the Didit API
    ///   - config: Optional configuration dictionary
    ///   - completion: Callback with result dictionary
    public func startVerification(
        token: String,
        config: NSDictionary?,
        completion: @escaping @Sendable (NSDictionary) -> Void
    ) {
        let parsed = ParsedConfig(config)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.presentVerification(completion: completion) {
                DiditSdk.shared.startVerification(
                    token: token,
                    configuration: parsed.toConfiguration()
                )
            }
        }
    }

    // MARK: - Start Verification with Workflow

    /// Start verification by creating a new session with a workflow ID.
    /// - Parameters:
    ///   - workflowId: Workflow identifier
    ///   - vendorData: Optional vendor data
    ///   - metadata: Optional metadata
    ///   - contactDetails: Optional contact details dictionary
    ///   - expectedDetails: Optional expected details dictionary
    ///   - config: Optional configuration dictionary
    ///   - completion: Callback with result dictionary
    public func startVerificationWithWorkflow(
        workflowId: String,
        vendorData: String?,
        metadata: String?,
        contactDetails: NSDictionary?,
        expectedDetails: NSDictionary?,
        config: NSDictionary?,
        completion: @escaping @Sendable (NSDictionary) -> Void
    ) {
        let parsed = ParsedConfig(config)
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.presentVerification(completion: completion) {
                DiditSdk.shared.startVerification(
                    workflowId: workflowId,
                    vendorData: vendorData,
                    configuration: parsed.toConfiguration()
                )
            }
        }
    }

    // MARK: - Presentation Logic

    /// Presents the verification flow in a UIHostingController.
    /// Uses the public `.diditVerification(onComplete:)` SwiftUI modifier,
    /// so no internal SDK types need to be exposed.
    private func presentVerification(
        completion: @escaping @Sendable (NSDictionary) -> Void,
        startAction: @escaping @Sendable () -> Void
    ) {
        guard let rootVC = Self.findRootViewController() else {
            let error: NSDictionary = [
                "type": "failed",
                "errorType": "unknown",
                "errorMessage": "Unable to find root view controller to present verification UI."
            ]
            completion(error)
            return
        }

        let bridgeView = DiditBridgeView(
            onResult: { [weak self] result in
                let mapped = Self.mapVerificationResult(result)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    self?.hostingController?.dismiss(animated: false) {
                        self?.hostingController = nil
                    }
                }

                completion(mapped)
            },
            startAction: startAction
        )

        let hostingVC = UIHostingController(rootView: bridgeView)
        hostingVC.modalPresentationStyle = .overFullScreen
        hostingVC.view.backgroundColor = .clear
        self.hostingController = hostingVC

        rootVC.present(hostingVC, animated: false)
    }

    // MARK: - View Controller Helpers

    private static func findRootViewController() -> UIViewController? {
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first,
              let rootVC = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController
        else {
            return nil
        }

        // Walk the presentation chain to find the topmost presented controller
        var topVC = rootVC
        while let presented = topVC.presentedViewController {
            topVC = presented
        }
        return topVC
    }

    // MARK: - Configuration Parsing

    /// Sendable value type that captures config primitives before crossing concurrency boundaries.
    private struct ParsedConfig: Sendable {
        let languageCode: String?
        let fontFamily: String?
        let loggingEnabled: Bool
        let showCloseButton: Bool
        let showExitConfirmation: Bool
        let closeOnComplete: Bool
        let isEmpty: Bool

        init(_ dict: NSDictionary?) {
            guard let dict = dict, dict.count > 0 else {
                self.languageCode = nil
                self.fontFamily = nil
                self.loggingEnabled = false
                self.showCloseButton = true
                self.showExitConfirmation = true
                self.closeOnComplete = false
                self.isEmpty = true
                return
            }
            self.languageCode = dict["languageCode"] as? String
            self.fontFamily = dict["fontFamily"] as? String
            self.loggingEnabled = dict["loggingEnabled"] as? Bool ?? false
            self.showCloseButton = dict["showCloseButton"] as? Bool ?? true
            self.showExitConfirmation = dict["showExitConfirmation"] as? Bool ?? true
            self.closeOnComplete = dict["closeOnComplete"] as? Bool ?? false
            self.isEmpty = false
        }

        func toConfiguration() -> DiditSdk.Configuration? {
            guard !isEmpty else { return nil }
            var language: SupportedLanguage?
            if let code = languageCode {
                language = SupportedLanguage.allCases.first { $0.code == code }
            }
            return DiditSdk.Configuration(
                languageLocale: language,
                fontFamily: fontFamily,
                loggingEnabled: loggingEnabled,
                showCloseButton: showCloseButton,
                showExitConfirmation: showExitConfirmation,
                closeOnComplete: closeOnComplete
            )
        }
    }


    // MARK: - Result Mapping

    /// Normalizes VerificationStatus to capitalized strings matching the Android SDK format.
    /// iOS rawValue is lowercase ("approved"), Android is capitalized ("Approved").
    /// The JS layer expects the capitalized form.
    private static func statusString(_ status: VerificationStatus) -> String {
        switch status {
        case .approved: return "Approved"
        case .pending: return "Pending"
        case .declined: return "Declined"
        @unknown default: return "Pending"
        }
    }

    /// Maps a native VerificationResult to an NSDictionary for the JS layer.
    private static func mapVerificationResult(_ result: VerificationResult) -> NSDictionary {
        switch result {
        case .completed(let session):
            return [
                "type": "completed",
                "sessionId": session.sessionId,
                "status": statusString(session.status)
            ]

        case .cancelled(let session):
            let dict = NSMutableDictionary()
            dict["type"] = "cancelled"
            if let session = session {
                dict["sessionId"] = session.sessionId
                dict["status"] = statusString(session.status)
            }
            return dict

        case .failed(let error, let session):
            let dict = NSMutableDictionary()
            dict["type"] = "failed"
            dict["errorType"] = mapErrorType(error)
            dict["errorMessage"] = error.localizedDescription
            if let session = session {
                dict["sessionId"] = session.sessionId
                dict["status"] = statusString(session.status)
            }
            return dict

        @unknown default:
            return [
                "type": "failed",
                "errorType": "unknown",
                "errorMessage": "Unrecognized verification result"
            ]
        }
    }

    private static func mapErrorType(_ error: VerificationError) -> String {
        switch error {
        case .sessionExpired:
            return "sessionExpired"
        case .networkError:
            return "networkError"
        case .cameraAccessDenied:
            return "cameraAccessDenied"
        case .unknown:
            return "unknown"
        @unknown default:
            return "unknown"
        }
    }
}

// MARK: - SwiftUI Bridge View

/// A transparent SwiftUI view that uses the public `.diditVerification` modifier
/// to host the verification flow. This avoids needing to access internal SDK types.
private struct DiditBridgeView: View {
    let onResult: @Sendable (VerificationResult) -> Void
    let startAction: @Sendable () -> Void

    var body: some View {
        Color.clear
            .edgesIgnoringSafeArea(.all)
            .diditVerification { result in
                onResult(result)
            }
            .onAppear {
                startAction()
            }
    }
}
