# R8/ProGuard rules applied to every app that depends on this library.

# Keep ReactModuleInfo's public constructors as declared. R8's optimizing pass
# otherwise drops unused constructor parameters, and code that picks a
# constructor by its parameter count, as earlier releases of this package did,
# then crashes the app at launch (issue #61).
-keep class com.facebook.react.module.model.ReactModuleInfo { public <init>(...); }
