import UIKit
import SwiftUI
@preconcurrency import DiditSDK

// MARK: - Swift Bridge for React Native TurboModule

/// Bridge class that exposes DiditSDK functionality to Objective-C++.
/// This is the adapter between the ObjC++ TurboModule and the Swift DiditSDK.
@objcMembers
public class DiditSdkBridge: NSObject, @unchecked Sendable {

    private var hostingController: UIViewController?
    private var presentationGeneration = 0
    private var hasDeliveredResult = false

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
                MainActor.assumeIsolated {
                    DiditSdk.shared.startVerification(
                        token: token,
                        configuration: parsed.toConfiguration()
                    )
                }
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
                MainActor.assumeIsolated {
                    DiditSdk.shared.startVerification(
                        workflowId: workflowId,
                        vendorData: vendorData,
                        configuration: parsed.toConfiguration()
                    )
                }
            }
        }
    }

    // MARK: - Presentation Logic

    private func presentVerification(
        completion: @escaping @Sendable (NSDictionary) -> Void,
        startAction: @escaping @Sendable () -> Void
    ) {
        removeStaleHostIfPresent()
        let generation = beginPresentation()

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
                guard let self = self, self.claimResultDelivery(for: generation) else { return }
                self.tearDownThenResolve(
                    generation: generation,
                    result: Self.mapVerificationResult(result),
                    completion: completion
                )
            }
        )

        let hostingVC = UIHostingController(rootView: bridgeView)
        hostingVC.modalPresentationStyle = .overFullScreen
        hostingVC.view.backgroundColor = .clear
        self.hostingController = hostingVC

        presentHostThenStartFlow(hostingVC, from: rootVC, startFlow: startAction)
    }

    private func removeStaleHostIfPresent() {
        guard let stale = hostingController else { return }
        Self.dismissFromPresenter(stale)
        hostingController = nil
    }

    private func beginPresentation() -> Int {
        presentationGeneration += 1
        hasDeliveredResult = false
        return presentationGeneration
    }

    private func claimResultDelivery(for generation: Int) -> Bool {
        guard !hasDeliveredResult, presentationGeneration == generation else { return false }
        hasDeliveredResult = true
        return true
    }

    private func tearDownThenResolve(
        generation: Int,
        result: NSDictionary,
        completion: @escaping @Sendable (NSDictionary) -> Void
    ) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            guard self.presentationGeneration == generation,
                  let host = self.hostingController else {
                completion(result)
                return
            }
            Self.dismissFromPresenter(host) {
                self.hostingController = nil
                completion(result)
            }
        }
    }

    private func presentHostThenStartFlow(
        _ host: UIViewController,
        from presenter: UIViewController,
        startFlow: @escaping @Sendable () -> Void
    ) {
        presenter.present(host, animated: false, completion: startFlow)
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

        return topmostPresentedController(startingFrom: rootVC)
    }

    private static func topmostPresentedController(startingFrom root: UIViewController) -> UIViewController {
        var controller = root
        while let presented = controller.presentedViewController, !presented.isBeingDismissed {
            controller = presented
        }
        return controller
    }

    private static func dismissFromPresenter(_ controller: UIViewController, completion: (() -> Void)? = nil) {
        (controller.presentingViewController ?? controller).dismiss(animated: false, completion: completion)
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
        let defaultDocumentCamera: String?
        let defaultLivenessCamera: String?
        let showDocumentCameraSwitchButton: Bool
        let showLivenessCameraSwitchButton: Bool
        let isEmpty: Bool

        init(_ dict: NSDictionary?) {
            guard let dict = dict, dict.count > 0 else {
                self.languageCode = nil
                self.fontFamily = nil
                self.loggingEnabled = false
                self.showCloseButton = true
                self.showExitConfirmation = true
                self.closeOnComplete = false
                self.defaultDocumentCamera = nil
                self.defaultLivenessCamera = nil
                self.showDocumentCameraSwitchButton = true
                self.showLivenessCameraSwitchButton = true
                self.isEmpty = true
                return
            }
            self.languageCode = dict["languageCode"] as? String
            self.fontFamily = dict["fontFamily"] as? String
            self.loggingEnabled = dict["loggingEnabled"] as? Bool ?? false
            self.showCloseButton = dict["showCloseButton"] as? Bool ?? true
            self.showExitConfirmation = dict["showExitConfirmation"] as? Bool ?? true
            self.closeOnComplete = dict["closeOnComplete"] as? Bool ?? false
            self.defaultDocumentCamera = dict["defaultDocumentCamera"] as? String
            self.defaultLivenessCamera = dict["defaultLivenessCamera"] as? String
            self.showDocumentCameraSwitchButton = dict["showDocumentCameraSwitchButton"] as? Bool ?? true
            self.showLivenessCameraSwitchButton = dict["showLivenessCameraSwitchButton"] as? Bool ?? true
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
                closeOnComplete: closeOnComplete,
                defaultDocumentCamera: Self.parseCameraLens(defaultDocumentCamera) ?? .back,
                defaultLivenessCamera: Self.parseCameraLens(defaultLivenessCamera) ?? .front,
                showDocumentCameraSwitchButton: showDocumentCameraSwitchButton,
                showLivenessCameraSwitchButton: showLivenessCameraSwitchButton
            )
        }

        private static func parseCameraLens(_ value: String?) -> CameraLens? {
            switch value?.lowercased() {
            case "front": return .front
            case "back": return .back
            default: return nil
            }
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

    var body: some View {
        Color.clear
            .edgesIgnoringSafeArea(.all)
            .diditVerification { result in
                onResult(result)
            }
    }
}
