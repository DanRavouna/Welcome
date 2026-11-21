package com.dan.spacecube

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.webkit.WebResourceRequest
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

    private lateinit var web: WebView
    private lateinit var bridge: LauncherBridge

    // Re-sends the app list to the page whenever an app is installed, removed or updated.
    private val packageReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            bridge.invalidateCache()
            js("window.onAppsChanged && window.onAppsChanged()")
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
            setBackgroundColor(android.graphics.Color.BLACK)
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            overScrollMode = WebView.OVER_SCROLL_NEVER
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assetLoader.shouldInterceptRequest(request.url)

                // Never leave the launcher page by following a link inside it.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != "appassets.androidplatform.net"
            }
        }
        bridge = LauncherBridge(this)
        web.addJavascriptInterface(bridge, "Launcher")
        setContentView(web)
        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")

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
        js("window.setPaused && window.setPaused(true)")
        web.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        unregisterReceiver(packageReceiver)
        web.destroy()
        super.onDestroy()
    }

    fun js(code: String) = runOnUiThread { web.evaluateJavascript(code, null) }
}
