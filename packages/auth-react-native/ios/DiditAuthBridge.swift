import UIKit
#if canImport(DiditAuth)
@preconcurrency import DiditAuth
#else
// A DiditSDK source pod compiles DiditAuth into the DiditSDK module.
@preconcurrency import DiditSDK
#endif

/// Forwards the TurboModule's calls to native DiditAuth; its error codes reach JavaScript unchanged.
/// Sessions and step-up results cross the bridge as JSON strings.
@objcMembers
public final class DiditAuthBridge: NSObject, @unchecked Sendable {
    public typealias Resolve = @Sendable (String?) -> Void
    public typealias Reject = @Sendable (String, String, NSDictionary?) -> Void

    // React Native's code for a rejection that is not a DiditAuth error.
    private static let unspecified = "EUNSPECIFIED"

    // One DiditAuth per application, created and read on the main actor only.
    @MainActor private var instances: [String: DiditAuth] = [:]

    public func signIn(publishableKey: String, redirectUri: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            try Self.json(Self.session(try await auth.signIn(from: try Self.presenter())))
        }
    }

    public func signInWithPasskey(publishableKey: String, redirectUri: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            try Self.json(Self.session(try await auth.signInWithPasskey(from: try Self.presenter())))
        }
    }

    public func registerPasskey(publishableKey: String, redirectUri: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            try await auth.registerPasskey(from: try Self.presenter())
        }
    }

    public func currentSession(publishableKey: String, redirectUri: String, force: Bool, resolve: @escaping Resolve, reject: @escaping Reject) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            try await auth.currentSession(force: force).map { try Self.json(Self.session($0)) }
        }
    }

    public func getToken(publishableKey: String, redirectUri: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            try await auth.getToken()
        }
    }

    public func signOut(publishableKey: String, redirectUri: String, resolve: @escaping Resolve, reject: @escaping Reject) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            try await auth.signOut()
            return nil
        }
    }

    public func stepUp(
        publishableKey: String,
        redirectUri: String,
        action: String,
        amount: String?,
        currency: String?,
        resolve: @escaping Resolve,
        reject: @escaping Reject
    ) {
        forward(publishableKey, redirectUri, resolve, reject) { auth in
            let stepUpAction = try Self.stepUpAction(action, amount: amount, currency: currency)
            return try Self.json(Self.stepUpResult(try await auth.stepUp(stepUpAction, from: try Self.presenter())))
        }
    }

    private func forward(
        _ publishableKey: String,
        _ redirectUri: String,
        _ resolve: @escaping Resolve,
        _ reject: @escaping Reject,
        _ operation: @escaping @MainActor @Sendable (DiditAuth) async throws -> String?
    ) {
        Task { @MainActor in
            do {
                resolve(try await operation(try self.auth(publishableKey, redirectUri)))
            } catch let error as DiditAuthError {
                reject(error.code, error.message, Self.userInfo(error) as NSDictionary)
            } catch {
                reject(Self.unspecified, error.localizedDescription, nil)
            }
        }
    }

    @MainActor
    private func auth(_ publishableKey: String, _ redirectUri: String) throws -> DiditAuth {
        let key = publishableKey + "\n" + redirectUri
        if let auth = instances[key] { return auth }
        let auth = try DiditAuth(publishableKey: publishableKey, redirectUri: redirectUri)
        instances[key] = auth
        return auth
    }

    @MainActor
    private static func presenter() throws -> UIViewController {
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first,
              var controller = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController
        else {
            throw DiditAuthError("browser_unavailable", "No screen is in the foreground to show the Didit page.")
        }
        while let presented = controller.presentedViewController, !presented.isBeingDismissed {
            controller = presented
        }
        return controller
    }

    private static func stepUpAction(_ action: String, amount: String?, currency: String?) throws -> DiditStepUpAction {
        switch action {
        case "payout":
            guard let amount = amount else {
                throw DiditAuthError("invalid_request", "A payout step-up needs an amount.")
            }
            return .payout(amount: amount, currency: currency)
        case "bank":
            return .bankAccount
        case "contact":
            return .contactChange
        default:
            throw DiditAuthError("invalid_request", "Unknown step-up action: \(action).")
        }
    }

    private static func userInfo(_ error: DiditAuthError) -> [String: Any] {
        var info: [String: Any] = [:]
        if let status = error.status { info["status"] = status }
        if let fields = error.fields { info["fields"] = fields }
        if let retryAfter = error.retryAfter { info["retryAfter"] = retryAfter }
        return info
    }

    private static func session(_ session: DiditSession) -> [String: Any] {
        [
            "userId": session.userId,
            "sessionId": session.sessionId,
            "applicationId": session.applicationId,
            "vendorData": orNull(session.vendorData),
            "email": orNull(session.email),
            "emailVerified": session.emailVerified,
            "phone": orNull(session.phone),
            "methods": session.methods,
            "mfaVerified": session.mfaVerified,
            "verified": orNull(session.verified),
            "organizations": session.organizations.map { ["id": $0.id, "name": $0.name, "role": $0.role] },
            "expiresAt": session.expiresAt,
        ]
    }

    private static func stepUpResult(_ result: DiditStepUpResult) -> [String: Any] {
        [
            "id": orNull(result.id),
            "status": result.status,
            "approved": result.isApproved,
            "rule": orNull(result.rule),
            "method": orNull(result.method),
        ]
    }

    private static func orNull(_ value: Any?) -> Any {
        value ?? NSNull()
    }

    private static func json(_ object: [String: Any]) throws -> String {
        String(decoding: try JSONSerialization.data(withJSONObject: object), as: UTF8.self)
    }
}
