package com.dan.spacecube

import android.annotation.SuppressLint
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import android.widget.ImageView
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
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
    // status bar / gesture bar sizes in CSS pixels, sent to the page so it keeps its UI clear of them
    private var insetTopCss = 0f
    private var insetBottomCss = 0f
    private fun sendInsets(): Unit = js("window.setInsets && window.setInsets($insetTopCss, $insetBottomCss)")

    private lateinit var web: WebView
    private lateinit var bridge: LauncherBridge

    // A native picture of empty space laid over the page. It's up whenever the page can't be trusted to
    // be on screen yet (starting up, screen off, unlocking), so Android's unlock snapshot and the moment
    // the page needs to redraw both show empty space instead of the old UI or a black frame.
    private lateinit var cover: ImageView
    private val handler = Handler(Looper.getMainLooper())
    private val coverFailsafe: Runnable = Runnable { hideCover() }

    fun showCover() {
        runOnUiThread { cover.animate().cancel(); cover.alpha = 1f; cover.visibility = View.VISIBLE }
    }
    /** The live frame the page just drew, used as the cover so unlock shows exactly the same picture. */
    fun setCoverBitmap(bmp: android.graphics.Bitmap) {
        runOnUiThread {
            cover.setImageBitmap(bmp)
            cover.scaleType = ImageView.ScaleType.FIT_XY        // same size as the page, pixel for pixel
            cover.animate().cancel(); cover.alpha = 1f; cover.visibility = View.VISIBLE
        }
    }
    /** Called by the page once it has drawn the first frame of the fly-in. */
    fun hideCover() {
        runOnUiThread {
            handler.removeCallbacks(coverFailsafe)
            if (cover.visibility == View.VISIBLE) {
                cover.visibility = View.GONE                         // identical to the live frame: swap instantly
            }
        }
    }

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
                Intent.ACTION_SCREEN_OFF -> { showCover(); js("window.onScreenOff && window.onScreenOff()") }
                Intent.ACTION_USER_PRESENT -> js("window.onUnlock && window.onUnlock()")
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Draw space edge to edge: under the status bar and the gesture/navigation bar (both transparent).
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = android.graphics.Color.TRANSPARENT
        window.navigationBarColor = android.graphics.Color.TRANSPARENT
        if (android.os.Build.VERSION.SDK_INT >= 29) {
            window.isNavigationBarContrastEnforced = false     // no grey scrim behind the gesture handle
            window.isStatusBarContrastEnforced = false
        }
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            window.attributes = window.attributes.apply {
                layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
        }
        WindowInsetsControllerCompat(window, window.decorView).apply {
            isAppearanceLightStatusBars = false                 // white status icons on dark space
            isAppearanceLightNavigationBars = false
        }

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
                    sendInsets()
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
        cover = ImageView(this).apply {
            setImageResource(R.drawable.space_cover)
            scaleType = ImageView.ScaleType.CENTER_CROP
            setBackgroundColor(android.graphics.Color.BLACK)
        }
        setContentView(FrameLayout(this).apply {
            addView(web, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
            addView(cover, FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT)
        })
        handler.postDelayed(coverFailsafe, 6000)      // never leave the cover up if the page stays silent

        // Measure the system bars and tell the page (in CSS px = device px / density)
        ViewCompat.setOnApplyWindowInsetsListener(web) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            val d = resources.displayMetrics.density
            insetTopCss = bars.top / d
            insetBottomCss = bars.bottom / d
            sendInsets()
            insets
        }
        web.loadUrl("$LIVE_URL?v=${System.currentTimeMillis()}")   // new address each start: skips GitHub's 10-minute cache

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
        if (cover.visibility == View.VISIBLE) { handler.removeCallbacks(coverFailsafe); handler.postDelayed(coverFailsafe, 3000) }
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

    fun js(code: String): Unit = runOnUiThread { web.evaluateJavascript(code, null) }
}
