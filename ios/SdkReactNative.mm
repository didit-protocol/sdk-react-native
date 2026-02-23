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

// MARK: - Codegen Struct → NSDictionary Helpers

- (NSDictionary *)configDictFrom:(JS::NativeSdkReactNative::VerificationConfig &)config
{
    NSMutableDictionary *dict = [NSMutableDictionary new];
    if (config.languageCode()) {
        dict[@"languageCode"] = config.languageCode();
    }
    if (config.fontFamily()) {
        dict[@"fontFamily"] = config.fontFamily();
    }
    if (config.loggingEnabled().has_value()) {
        dict[@"loggingEnabled"] = @(config.loggingEnabled().value());
    }
    return dict;
}

- (NSDictionary *)contactDictFrom:(JS::NativeSdkReactNative::ContactDetails &)details
{
    NSMutableDictionary *dict = [NSMutableDictionary new];
    if (details.email()) {
        dict[@"email"] = details.email();
    }
    if (details.sendNotificationEmails().has_value()) {
        dict[@"sendNotificationEmails"] = @(details.sendNotificationEmails().value());
    }
    if (details.emailLang()) {
        dict[@"emailLang"] = details.emailLang();
    }
    if (details.phone()) {
        dict[@"phone"] = details.phone();
    }
    return dict;
}

- (NSDictionary *)expectedDictFrom:(JS::NativeSdkReactNative::ExpectedDetails &)details
{
    NSMutableDictionary *dict = [NSMutableDictionary new];
    if (details.firstName())            dict[@"firstName"] = details.firstName();
    if (details.lastName())             dict[@"lastName"] = details.lastName();
    if (details.dateOfBirth())          dict[@"dateOfBirth"] = details.dateOfBirth();
    if (details.gender())               dict[@"gender"] = details.gender();
    if (details.nationality())          dict[@"nationality"] = details.nationality();
    if (details.country())              dict[@"country"] = details.country();
    if (details.address())              dict[@"address"] = details.address();
    if (details.identificationNumber()) dict[@"identificationNumber"] = details.identificationNumber();
    if (details.ipAddress())            dict[@"ipAddress"] = details.ipAddress();
    if (details.portraitImage())        dict[@"portraitImage"] = details.portraitImage();
    return dict;
}

// MARK: - TurboModule Spec Methods

- (void)startVerification:(NSString *)token
                   config:(JS::NativeSdkReactNative::VerificationConfig &)config
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject
{
    NSDictionary *configDict = (&config != nullptr) ? [self configDictFrom:config] : nil;

    [_bridge startVerificationWithToken:token
                                 config:configDict
                             completion:^(NSDictionary *result) {
        resolve(result);
    }];
}

- (void)startVerificationWithWorkflow:(NSString *)workflowId
                           vendorData:(NSString *)vendorData
                             metadata:(NSString *)metadata
                       contactDetails:(JS::NativeSdkReactNative::ContactDetails &)contactDetails
                      expectedDetails:(JS::NativeSdkReactNative::ExpectedDetails &)expectedDetails
                               config:(JS::NativeSdkReactNative::VerificationConfig &)config
                              resolve:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject
{
    NSDictionary *configDict = (&config != nullptr) ? [self configDictFrom:config] : nil;
    NSDictionary *contactDict = (&contactDetails != nullptr) ? [self contactDictFrom:contactDetails] : nil;
    NSDictionary *expectedDict = (&expectedDetails != nullptr) ? [self expectedDictFrom:expectedDetails] : nil;

    [_bridge startVerificationWithWorkflowWithWorkflowId:workflowId
                                              vendorData:vendorData
                                                metadata:metadata
                                          contactDetails:contactDict
                                         expectedDetails:expectedDict
                                                  config:configDict
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
