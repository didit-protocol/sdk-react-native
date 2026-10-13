#import "DiditAuthReactNative.h"

// The Swift-generated header is named after the pod's module (DiditAuthReactNative).
#if __has_include(<DiditAuthReactNative/DiditAuthReactNative-Swift.h>)
#import <DiditAuthReactNative/DiditAuthReactNative-Swift.h>
#else
#import "DiditAuthReactNative-Swift.h"
#endif

typedef void (^DiditAuthRejectBlock)(NSString *code, NSString *message, NSDictionary *userInfoFields);

/// Keeps DiditAuth's status, fields and retryAfter on the JavaScript error's userInfo.
static DiditAuthRejectBlock DiditAuthReject(RCTPromiseRejectBlock reject)
{
    return ^(NSString *code, NSString *message, NSDictionary *userInfoFields) {
        NSMutableDictionary *userInfo = [NSMutableDictionary new];
        if (message) {
            userInfo[NSLocalizedDescriptionKey] = message;
        }
        if (userInfoFields) {
            [userInfo addEntriesFromDictionary:userInfoFields];
        }
        reject(code, message, [NSError errorWithDomain:@"me.didit.sdk.auth" code:0 userInfo:userInfo]);
    };
}

@implementation DiditAuthReactNative {
    DiditAuthBridge *_bridge;
}

RCT_EXPORT_MODULE(DiditAuthReactNative)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (instancetype)init
{
    if (self = [super init]) {
        _bridge = [[DiditAuthBridge alloc] init];
    }
    return self;
}

- (void)signIn:(NSString *)publishableKey
   redirectUri:(NSString *)redirectUri
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject
{
    [_bridge signInWithPublishableKey:publishableKey
                          redirectUri:redirectUri
                              resolve:^(NSString *result) { resolve(result); }
                               reject:DiditAuthReject(reject)];
}

- (void)signInWithPasskey:(NSString *)publishableKey
              redirectUri:(NSString *)redirectUri
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    [_bridge signInWithPasskeyWithPublishableKey:publishableKey
                                     redirectUri:redirectUri
                                         resolve:^(NSString *result) { resolve(result); }
                                          reject:DiditAuthReject(reject)];
}

- (void)registerPasskey:(NSString *)publishableKey
            redirectUri:(NSString *)redirectUri
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject
{
    [_bridge registerPasskeyWithPublishableKey:publishableKey
                                   redirectUri:redirectUri
                                       resolve:^(NSString *result) { resolve(result); }
                                        reject:DiditAuthReject(reject)];
}

- (void)currentSession:(NSString *)publishableKey
           redirectUri:(NSString *)redirectUri
                 force:(BOOL)force
               resolve:(RCTPromiseResolveBlock)resolve
                reject:(RCTPromiseRejectBlock)reject
{
    [_bridge currentSessionWithPublishableKey:publishableKey
                                  redirectUri:redirectUri
                                        force:force
                                      resolve:^(NSString *result) { resolve(result); }
                                       reject:DiditAuthReject(reject)];
}

- (void)getToken:(NSString *)publishableKey
     redirectUri:(NSString *)redirectUri
         resolve:(RCTPromiseResolveBlock)resolve
          reject:(RCTPromiseRejectBlock)reject
{
    [_bridge getTokenWithPublishableKey:publishableKey
                            redirectUri:redirectUri
                                resolve:^(NSString *result) { resolve(result); }
                                 reject:DiditAuthReject(reject)];
}

- (void)signOut:(NSString *)publishableKey
    redirectUri:(NSString *)redirectUri
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
    [_bridge signOutWithPublishableKey:publishableKey
                           redirectUri:redirectUri
                               resolve:^(NSString *result) { resolve(result); }
                                reject:DiditAuthReject(reject)];
}

- (void)stepUp:(NSString *)publishableKey
   redirectUri:(NSString *)redirectUri
        action:(NSString *)action
        amount:(NSString * _Nullable)amount
      currency:(NSString * _Nullable)currency
       resolve:(RCTPromiseResolveBlock)resolve
        reject:(RCTPromiseRejectBlock)reject
{
    [_bridge stepUpWithPublishableKey:publishableKey
                          redirectUri:redirectUri
                               action:action
                               amount:amount
                             currency:currency
                              resolve:^(NSString *result) { resolve(result); }
                               reject:DiditAuthReject(reject)];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDiditAuthSpecJSI>(params);
}

@end
