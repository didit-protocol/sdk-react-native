#import "DiditAuthReactNative.h"

@implementation DiditAuthReactNative

RCT_EXPORT_MODULE(DiditAuthReactNative)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (void)rejectUnavailable:(RCTPromiseRejectBlock)reject
{
  reject(@"ERR_DIDIT_AUTH_UNAVAILABLE", @"DiditAuth is unavailable in this build.", nil);
}

- (void)signIn:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self rejectUnavailable:reject];
}

- (void)currentSession:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self rejectUnavailable:reject];
}

- (void)getToken:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self rejectUnavailable:reject];
}

- (void)signOut:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self rejectUnavailable:reject];
}

- (void)stepUp:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [self rejectUnavailable:reject];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDiditAuthSpecJSI>(params);
}

@end
