---
"@didit-protocol/sdk-react-native": patch
---

Android: the package now adds Didit's Maven repository to the app's build itself, so a React Native app needs no Gradle change to resolve the Didit SDK.

### Fixed

- On a new React Native 0.88 app, following the README (the Didit repository in `settings.gradle`) failed with `Could not find me.didit:didit-sdk:4.15.1`: React Native's Gradle plugin declares repositories on every project, so Gradle ignores the ones an app lists in `settings.gradle`, and the repository the package declared for its own module does not reach the app's dependency resolution. `android/build.gradle` now adds the repository, still scoped to the `me.didit` group, to every project of the build (`rootProject.allprojects`), as Didit's Flutter plugins do. The README no longer asks for the `settings.gradle` entry.
