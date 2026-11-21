package com.dan.spacecube

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader

/**
 * The whole home screen is the 3D page in app/src/main/assets/index.html, shown in a WebView.
 * This activity:
 *  - serves that page from the app's own files (works offline),
 *  - exposes [LauncherBridge] to it as `window.Launcher` (installed apps, launching, etc.),
 *  - forwards Home / Back presses and app installs/removals to the page,
 *  - pauses the 3D rendering while another app is in front (saves battery).
 */
class MainActivity : ComponentActivity() {

    companion object {
        // LIVE: the home screen is loaded from the website, so page updates arrive without reinstalling.
        // Triple-tap the clock to reload. If the site can't be reached, the copy built into the app is used.
        const val LIVE_URL = "https://danravouna.github.io/Welcome/space-cube/index.html"
        const val LIVE_HOST = "danravouna.github.io"
        const val LOCAL_URL = "https://appassets.androidplatform.net/assets/index.html"
    }
    private var usingLocal = false

    private lateinit var web: WebView
    private lateinit var bridge: LauncherBridge

    // Re-sends the app list to the page whenever an app is installed, removed or updated.
    private val packageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            bridge.invalidateCache()
            js("window.onAppsChanged && window.onAppsChanged()")
        }
    }

    // Screen off: the page gets the fly-in's start ready. Phone unlocked: the page plays it.
    private val unlockReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                Intent.ACTION_SCREEN_OFF -> js("window.onScreenOff && window.onScreenOff()")
                Intent.ACTION_USER_PRESENT -> js("window.onUnlock && window.onUnlock()")
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Serve assets from https://appassets.androidplatform.net/assets/... (a safe, local-only address)
        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true            // localStorage: groups, favourites
            settings.mediaPlaybackRequiresUserGesture = true
            settings.cacheMode = WebSettings.LOAD_NO_CACHE   // always fetch the newest version of the page
            setBackgroundColor(android.graphics.Color.BLACK)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = WebView.OVER_SCROLL_NEVER
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)

                // Never leave the launcher page by following a link inside it.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != "appassets.androidplatform.net" && request.url.host != LIVE_HOST

                // Tell the page this build sends a real unlock signal (so it doesn't guess).
                override fun onPageFinished(view: WebView, url: String) {
                    view.evaluateJavascript("window.__hasUnlockHook = true", null)
                }

                // Website unreachable (offline...): fall back to the copy inside the app.
                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                    if (request.isForMainFrame && !usingLocal) { usingLocal = true; view.loadUrl(LOCAL_URL) }
                }
                override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: WebResourceResponse) {
                    if (request.isForMainFrame && !usingLocal && response.statusCode >= 400) { usingLocal = true; view.loadUrl(LOCAL_URL) }
                }
            }
        }
        bridge = LauncherBridge(this)
        web.addJavascriptInterface(bridge, "Launcher")
        setContentView(web)
        web.loadUrl(LIVE_URL)

        // Back: let the page close whatever is open (keyboard, group, settings...). A launcher never exits on Back.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                js("window.handleBack && window.handleBack()")
            }
        })

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED)
            addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_CHANGED)
            addAction(Intent.ACTION_PACKAGE_REPLACED)
            addDataScheme("package")
        }
        ContextCompat.registerReceiver(this, packageReceiver, filter, ContextCompat.RECEIVER_EXPORTED)
        val screenFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        ContextCompat.registerReceiver(this, unlockReceiver, screenFilter, ContextCompat.RECEIVER_EXPORTED)
    }

    // Pressing Home while the launcher is already showing: go back to the main group view.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (Intent.ACTION_MAIN == intent.action && intent.hasCategory(Intent.CATEGORY_HOME)) {
            js("window.goHome && window.goHome()")
        }
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        js("window.setPaused && window.setPaused(false)")
    }

    override fun onPause() {
        js("window.setPaused && window.setPaused(true)")   // the page stops drawing; the WebView itself stays warm
        super.onPause()
    }

    override fun onDestroy() {
        unregisterReceiver(packageReceiver)
        unregisterReceiver(unlockReceiver)
        web.destroy()
        super.onDestroy()
    }

    fun js(code: String) = runOnUiThread { web.evaluateJavascript(code, null) }
}
