#import "SdkReactNative.h"

// Import the Swift-generated header for the bridge class.
// The header name follows the pattern: <ProductModuleName>-Swift.h
// where ProductModuleName is derived from the CocoaPods pod name (SdkReactNative).
#if __has_include(<SdkReactNative/SdkReactNative-Swift.h>)
#import <SdkReactNative/SdkReactNative-Swift.h>
#else
#import "SdkReactNative-Swift.h"
#endif

@implementation SdkReactNative {
    DiditSdkBridge *_bridge;
}

- (instancetype)init {
    if (self = [super init]) {
        _bridge = [[DiditSdkBridge alloc] init];
    }
    return self;
}

// MARK: - TurboModule Spec Methods

- (void)startVerification:(NSString *)token
                   config:(NSDictionary *)config
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    [_bridge startVerificationWithToken:token
                                 config:config
                             completion:^(NSDictionary *result) {
        resolve(result);
    }];
}

- (void)startVerificationWithWorkflow:(NSString *)workflowId
                           vendorData:(NSString *)vendorData
                             metadata:(NSString *)metadata
                       contactDetails:(NSDictionary *)contactDetails
                      expectedDetails:(NSDictionary *)expectedDetails
                               config:(NSDictionary *)config
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
    [_bridge startVerificationWithWorkflowWithWorkflowId:workflowId
                                              vendorData:vendorData
                                                metadata:metadata
                                          contactDetails:contactDetails
                                         expectedDetails:expectedDetails
                                                  config:config
                                              completion:^(NSDictionary *result) {
        resolve(result);
    }];
}

// MARK: - TurboModule Registration

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSdkReactNativeSpecJSI>(params);
}

+ (NSString *)moduleName
{
    return @"SdkReactNative";
}

@end
