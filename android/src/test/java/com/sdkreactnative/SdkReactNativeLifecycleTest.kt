package com.sdkreactnative

import android.app.Activity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.common.LifecycleState
import java.util.concurrent.CopyOnWriteArrayList
import kotlin.coroutines.Continuation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import me.didit.sdk.DiditSdk
import me.didit.sdk.DiditSdkState
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.mockito.MockedStatic
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockStatic
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

/**
 * The Android bridge used to launch the verification UI as soon as the native
 * SDK reached Ready, even when the host app was in the background. Android 10+
 * refuses that activity start, so nothing appeared and the JS promise stayed
 * pending until the process died.
 *
 * These tests drive the real bridge function and the real native
 * `DiditSdk.launchVerificationUI()` against a mocked host, and pin the two
 * lifecycle rules the wrapper must follow:
 *
 *  - no verification activity is started while the host is not resumed;
 *  - exactly one is started once the host resumes, and a destroyed host settles
 *    the promise instead of leaving it pending.
 */
class SdkReactNativeLifecycleTest {

  private lateinit var arguments: MockedStatic<Arguments>
  private lateinit var reactContext: ReactApplicationContext
  private lateinit var module: SdkReactNativeModule
  private lateinit var promise: Promise
  private lateinit var activity: Activity
  private val listeners = CopyOnWriteArrayList<LifecycleEventListener>()

  private val awaitReadyAndLaunchUI =
    SdkReactNativeModule::class.java
      .getDeclaredMethod(
        "awaitReadyAndLaunchUI",
        Promise::class.java,
        Activity::class.java,
        Continuation::class.java
      )
      .apply { isAccessible = true }

  @Before
  fun setUp() {
    // React Native's native map cannot be constructed in a JVM test.
    arguments = mockStatic(Arguments::class.java)
    arguments.`when`<WritableMap> { Arguments.createMap() }.thenAnswer { mock(WritableMap::class.java) }

    reactContext = mock(ReactApplicationContext::class.java)
    `when`(reactContext.currentActivity).thenReturn(null)
    `when`(reactContext.lifecycleState).thenReturn(LifecycleState.BEFORE_RESUME)
    doAnswer { invocation ->
      listeners.add(invocation.getArgument(0))
      Unit
    }.`when`(reactContext).addLifecycleEventListener(any())
    doAnswer { invocation ->
      listeners.remove(invocation.getArgument(0))
      Unit
    }.`when`(reactContext).removeLifecycleEventListener(any())

    module = SdkReactNativeModule(reactContext)
    promise = mock(Promise::class.java)
    activity = mock(Activity::class.java)
  }

  @After
  fun tearDown() {
    arguments.close()
  }

  private fun setSdkState(state: DiditSdkState) {
    val field = DiditSdk::class.java.getDeclaredField("_state")
    field.isAccessible = true
    @Suppress("UNCHECKED_CAST")
    (field.get(DiditSdk) as MutableStateFlow<DiditSdkState>).value = state
  }

  /** Runs the bridge's suspend launch helper without blocking the test thread. */
  private fun awaitLaunch(): Job =
    CoroutineScope(Dispatchers.Unconfined).launch {
      suspendCancellableCoroutine<Unit> { continuation ->
        awaitReadyAndLaunchUI.invoke(module, promise, activity, continuation)
      }
    }

  @Test
  fun `does not start the verification UI while the host is backgrounded`() {
    setSdkState(DiditSdkState.Ready)
    `when`(reactContext.currentActivity).thenReturn(activity)

    val job = awaitLaunch()

    // Android refuses this start in the background; attempting it is the bug.
    verify(activity, never()).startActivity(any())

    listeners.single().onHostResume()

    verify(activity, times(1)).startActivity(any())
    job.cancel()
  }

  @Test
  fun `repeated resume events launch the verification UI only once`() {
    setSdkState(DiditSdkState.Ready)
    `when`(reactContext.currentActivity).thenReturn(activity)

    val job = awaitLaunch()

    // A second resume cannot reach a listener the bridge already removed.
    repeat(2) { listeners.toList().forEach(LifecycleEventListener::onHostResume) }

    verify(activity, times(1)).startActivity(any())
    job.cancel()
  }

  @Test
  fun `a destroyed host settles the promise instead of leaving it pending`() {
    setSdkState(DiditSdkState.Ready)
    `when`(reactContext.currentActivity).thenReturn(activity)

    val job = awaitLaunch()

    listeners.single().onHostDestroy()

    verify(activity, never()).startActivity(any())
    verify(promise, times(1)).resolve(any())
    job.cancel()
  }

  @Test
  fun `a resumed host launches the verification UI once`() {
    setSdkState(DiditSdkState.Ready)
    `when`(reactContext.lifecycleState).thenReturn(LifecycleState.RESUMED)
    `when`(reactContext.currentActivity).thenReturn(activity)

    val job = awaitLaunch()

    verify(activity, times(1)).startActivity(any())
    verify(promise, never()).resolve(any())
    job.cancel()
  }
}
