package com.dan.spacecube

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.service.wallpaper.WallpaperService
import android.view.SurfaceHolder
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt
import kotlin.math.tan
import kotlin.random.Random

/**
 * Space Cube as a system live wallpaper: the same flying dot field as the launcher
 * (same numbers as the page's shader), over the same space background.
 * It only draws while it is on screen (lock screen, recent apps), at up to 30 fps.
 */
class SpaceWallpaper : WallpaperService() {
    override fun onCreateEngine(): Engine = SpaceEngine()

    inner class SpaceEngine : Engine() {
        private val N = 3000
        private val RAD = 70f
        private val R2 = RAD * RAD
        private val DOT_SPEED = 2f                         // CFG.dotSpeed in the page
        private val px = FloatArray(N); private val py = FloatArray(N); private val pz = FloatArray(N)
        private val size = FloatArray(N); private val speed = FloatArray(N); private val tint = IntArray(N)
        private val phase = FloatArray(N); private val sway = FloatArray(N); private val born = FloatArray(N)
        private val handler = Handler(Looper.getMainLooper())
        private var visible = false
        private var w = 1; private var h = 1
        private var bg: Bitmap? = null
        private val bgDst = Rect()
        private var t = 0f
        private var last = 0L
        private val sprites = Array(3) { arrayOfNulls<Bitmap>(2) }   // [colour][far/near]
        private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
            xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD)       // additive, like the page
        }
        private val dst = RectF()
        private val density = resources.displayMetrics.density
        private val draw = Runnable { frame() }

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)
            val rnd = Random(System.nanoTime())
            fun r(a: Float, b: Float) = a + rnd.nextFloat() * (b - a)
            for (i in 0 until N) {
                var x: Float; var y: Float; var z: Float
                do { x = r(-RAD, RAD); y = r(-RAD, RAD); z = r(-RAD, RAD) } while (x * x + y * y + z * z > R2)
                px[i] = x; py[i] = y; pz[i] = z
                size[i] = if (rnd.nextFloat() < 0.08f) r(2.2f, 3.4f) else r(0.7f, 1.7f)
                speed[i] = r(0.6f, 2.2f); phase[i] = r(0f, 6.283f); sway[i] = r(0.05f, 0.25f)
                val tn = rnd.nextFloat()
                tint[i] = if (tn >= 0.93f) 2 else if (tn >= 0.75f) 1 else 0
                born[i] = -100f
            }
            val cols = arrayOf(floatArrayOf(0.70f, 0.80f, 1.0f), floatArrayOf(1.0f, 0.92f, 0.80f), floatArrayOf(0.75f, 0.65f, 1.0f))
            for (c in 0..2) { sprites[c][0] = makeSprite(cols[c], 0f); sprites[c][1] = makeSprite(cols[c], 1f) }
            bg = try { BitmapFactory.decodeResource(resources, R.drawable.space_cover) } catch (e: Exception) { null }
        }

        /** The page's fragment shader, baked into a small bitmap (near = 0 far dot, 1 close dot). */
        private fun makeSprite(col: FloatArray, near: Float): Bitmap {
            val s = 64
            val pix = IntArray(s * s)
            for (j in 0 until s) for (i in 0 until s) {
                val cx = (i + 0.5f) / s - 0.5f; val cy = (j + 0.5f) / s - 0.5f
                val r = sqrt(cx * cx + cy * cy)
                fun ss(a: Float, b: Float, x: Float): Float { val k = ((x - a) / (b - a)).coerceIn(0f, 1f); return k * k * (3 - 2 * k) }
                val hot = 1f - ss(0.06f, 0.16f, r)
                val body = 1f - ss(0.16f, 0.28f, r)
                val glow = exp(-r * r * 22f) * (0.25f + 0.55f * near)
                val spikes = (max(0f, 1f - kotlin.math.abs(cx) * 16f) + max(0f, 1f - kotlin.math.abs(cy) * 16f)) * (1f - ss(0f, 0.5f, r)) * near * 0.7f
                val a = (body + glow + spikes).coerceIn(0f, 1f)
                val wm = max(hot, spikes * 0.8f); val gain = 1.15f + 0.5f * near
                // premultiplied colour for additive drawing
                val rr = ((col[0] + (1f - col[0]) * wm) * gain * a).coerceIn(0f, 1f)
                val gg = ((col[1] + (1f - col[1]) * wm) * gain * a).coerceIn(0f, 1f)
                val bb = ((col[2] + (1f - col[2]) * wm) * gain * a).coerceIn(0f, 1f)
                pix[j * s + i] = Color.argb((a * 255).toInt(), (rr * 255).toInt(), (gg * 255).toInt(), (bb * 255).toInt())
            }
            return Bitmap.createBitmap(pix, s, s, Bitmap.Config.ARGB_8888)
        }

        override fun onSurfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
            super.onSurfaceChanged(holder, format, width, height)
            w = width; h = height
            bg?.let { b ->                                   // centre-crop the background to fill the screen
                val sc = max(w / b.width.toFloat(), h / b.height.toFloat())
                val dw = (b.width * sc).toInt(); val dh = (b.height * sc).toInt()
                bgDst.set((w - dw) / 2, (h - dh) / 2, (w + dw) / 2, (h + dh) / 2)
            }
            frame()
        }

        override fun onVisibilityChanged(v: Boolean) {
            visible = v
            handler.removeCallbacks(draw)
            if (v) { last = SystemClock.uptimeMillis(); frame() }
        }

        override fun onSurfaceDestroyed(holder: SurfaceHolder) {
            visible = false; handler.removeCallbacks(draw); super.onSurfaceDestroyed(holder)
        }

        override fun onDestroy() { handler.removeCallbacks(draw); super.onDestroy() }

        private fun step(dt: Float) {
            t += dt
            for (i in 0 until N) {
                val sp = speed[i] * DOT_SPEED * dt
                pz[i] += sp                                   // toward you (camera looks down -z)
                px[i] += kotlin.math.sin(t * 0.3f + phase[i]) * sway[i] * dt
                py[i] += kotlin.math.cos(t * 0.25f + phase[i]) * sway[i] * dt
                if (px[i] * px[i] + py[i] * py[i] + pz[i] * pz[i] > R2) {   // passed you: re-enter far ahead
                    var a: Float; var b: Float
                    do { a = (Random.nextFloat() * 2 - 1) * RAD; b = (Random.nextFloat() * 2 - 1) * RAD } while (a * a + b * b > R2 * 0.98f)
                    px[i] = a; py[i] = b; pz[i] = -sqrt(R2 - a * a - b * b) + 0.5f
                    born[i] = t
                }
            }
        }

        private fun frame() {
            val now = SystemClock.uptimeMillis()
            val dt = if (last == 0L) 0f else min(0.1f, (now - last) / 1000f)
            last = now
            step(dt)
            val holder = surfaceHolder
            val c: Canvas = (try { holder.lockHardwareCanvas() } catch (e: Exception) { null })
                ?: (try { holder.lockCanvas() } catch (e: Exception) { null }) ?: run { if (visible) handler.postDelayed(draw, 100); return }
            try {
                c.drawColor(Color.BLACK)
                bg?.let { c.drawBitmap(it, null, bgDst, null) }
                val f = (h / 2f) / tan(Math.toRadians(27.5).toFloat())   // 55° vertical field of view, like the page
                val cx = w / 2f; val cy = h / 2f
                for (i in 0 until N) {
                    val d = -pz[i]
                    if (d < 0.3f) continue                    // behind you
                    val sx = cx + f * px[i] / d; val sy = cy - f * py[i] / d
                    val sz = (size[i] * density * (160f / max(d, 0.5f))).coerceIn(1.8f * density, 30f * density)
                    val rad = sz / 2f
                    if (sx < -rad || sx > w + rad || sy < -rad || sy > h + rad) continue
                    val fade = ((t - born[i]) / 1.2f).coerceIn(0f, 1f)
                    val near = 1f - ((d - 3f) / 29f).coerceIn(0f, 1f).let { it * it * (3 - 2 * it) }
                    dst.set(sx - rad, sy - rad, sx + rad, sy + rad)
                    val farA = (fade * (1f - near) * 255).toInt()
                    if (farA > 2) { paint.alpha = farA; c.drawBitmap(sprites[tint[i]][0]!!, null, dst, paint) }
                    if (near > 0.01f) { paint.alpha = (fade * near * 255).toInt(); c.drawBitmap(sprites[tint[i]][1]!!, null, dst, paint) }
                }
            } finally {
                holder.unlockCanvasAndPost(c)
            }
            if (visible) handler.postDelayed(draw, 33)      // ~30 fps, only while on screen
        }
    }
}
