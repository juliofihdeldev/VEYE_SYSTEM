package com.elitesoftwarestudio.veye.ui.map

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.util.LruCache
import android.util.TypedValue
import com.google.android.gms.maps.model.BitmapDescriptor
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * MapPlaceholder.tsx parity: 28dp disc, 2dp white border, ~10dp glyph, anchor bottom-center.
 * Cluster bubble: min 36×36dp, radius 18dp, fill rgba(176,19,35,0.92), white border, 13sp / 800 count.
 */
internal object VEYeMapMarkerBitmaps {

    private const val DISC_DP = 28f
    private const val BORDER_DP = 2f
    private const val GLYPH_DP = 10f
    private const val MARGIN_BOTTOM_DP = 2f
    private const val MAX_PULSE_SCALE = 1.14f

    private const val CLUSTER_MIN_W_DP = 36f
    private const val CLUSTER_H_DP = 36f
    private const val CLUSTER_PAD_H_DP = 8f
    private const val CLUSTER_CORNER_DP = 18f
    private const val CLUSTER_TEXT_SP = 13f

    private val clusterFillArgb = Color.argb((0.92f * 255f).roundToInt().coerceIn(0, 255), 176, 19, 35)
    private val clusterBorderArgb = Color.argb((0.95f * 255f).roundToInt().coerceIn(0, 255), 255, 255, 255)

    private data class PinCacheKey(val icon: DangerMapPinIcon, val color: Int, val scaleKey: Int)

    // Cache BitmapDescriptors directly to avoid frequent fromBitmap calls and registry pressure.
    private val pinDescriptorCache = LruCache<PinCacheKey, BitmapDescriptor>(256)
    private val clusterDescriptorCache = LruCache<Int, BitmapDescriptor>(64)

    fun pinDescriptor(context: Context, icon: DangerMapPinIcon, fillArgb: Int, scale: Float): BitmapDescriptor {
        val key = PinCacheKey(icon, fillArgb, scaleQuantizeKey(scale))
        return pinDescriptorCache.get(key) ?: synchronized(this) {
            pinDescriptorCache.get(key) ?: run {
                val bmp = renderDiscPin(context, icon, fillArgb, scale)
                val desc = BitmapDescriptorFactory.fromBitmap(bmp)
                pinDescriptorCache.put(key, desc)
                // Note: Do NOT recycle bmp here. Google Maps Renderer.LATEST can throw 
                // "Unmanaged descriptor" if the source bitmap is recycled immediately after fromBitmap.
                desc
            }
        }
    }

    fun clusterDescriptor(context: Context, count: Int): BitmapDescriptor {
        return clusterDescriptorCache.get(count) ?: synchronized(this) {
            clusterDescriptorCache.get(count) ?: run {
                val bmp = renderClusterBubble(context, count)
                val desc = BitmapDescriptorFactory.fromBitmap(bmp)
                clusterDescriptorCache.put(count, desc)
                desc
            }
        }
    }

    private fun scaleQuantizeKey(scale: Float): Int =
        (scale * 200f).roundToInt().coerceIn(200, 228)

    private fun renderDiscPin(
        context: Context,
        icon: DangerMapPinIcon,
        fillArgb: Int,
        scale: Float,
    ): Bitmap {
        val dm = context.resources.displayMetrics
        val density = dm.density
        val s = scale.coerceIn(1f, MAX_PULSE_SCALE)
        val discR = (DISC_DP / 2f) * s * density
        val borderW = BORDER_DP * s * density
        val marginBottom = MARGIN_BOTTOM_DP * density
        val maxR = (DISC_DP / 2f) * MAX_PULSE_SCALE * density
        val w = ceil(2f * maxR + borderW * 2f + 4f * density).toInt()
        val h = ceil(marginBottom + 2f * maxR + borderW + 4f * density).toInt()
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val cx = w / 2f
        val cy = h - marginBottom - discR

        val fillPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = fillArgb
            }
        val strokePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = borderW
                color = Color.argb((0.95f * 255f).roundToInt(), 255, 255, 255)
            }

        canvas.drawCircle(cx, cy, discR - borderW / 2f, fillPaint)
        canvas.drawCircle(cx, cy, discR - borderW / 2f, strokePaint)

        val glyphPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = Color.WHITE
            }
        drawGlyph(canvas, cx, cy, GLYPH_DP * s * density, icon, glyphPaint)
        return bmp
    }

    private fun drawGlyph(canvas: Canvas, cx: Float, cy: Float, size: Float, icon: DangerMapPinIcon, paint: Paint) {
        when (icon) {
            DangerMapPinIcon.Pistol -> drawPistolGlyph(canvas, cx, cy, size, paint)
            DangerMapPinIcon.Car -> drawCarGlyph(canvas, cx, cy, size, paint)
            DangerMapPinIcon.Fire -> drawFireGlyph(canvas, cx, cy, size, paint)
        }
    }

    private fun drawPistolGlyph(canvas: Canvas, cx: Float, cy: Float, s: Float, paint: Paint) {
        val body = RectF(cx - 0.38f * s, cy - 0.08f * s, cx + 0.32f * s, cy + 0.28f * s)
        val barrel = RectF(cx + 0.32f * s, cy - 0.02f * s, cx + 0.58f * s, cy + 0.12f * s)
        canvas.drawRoundRect(body, 0.08f * s, 0.08f * s, paint)
        canvas.drawRoundRect(barrel, 0.04f * s, 0.04f * s, paint)
    }

    private fun drawCarGlyph(canvas: Canvas, cx: Float, cy: Float, s: Float, paint: Paint) {
        val body = RectF(cx - 0.42f * s, cy - 0.12f * s, cx + 0.42f * s, cy + 0.18f * s)
        canvas.drawRoundRect(body, 0.14f * s, 0.14f * s, paint)
        val roof = RectF(cx - 0.28f * s, cy - 0.32f * s, cx + 0.28f * s, cy - 0.08f * s)
        canvas.drawRoundRect(roof, 0.08f * s, 0.08f * s, paint)
    }

    private fun drawFireGlyph(canvas: Canvas, cx: Float, cy: Float, s: Float, paint: Paint) {
        val p = Path()
        p.moveTo(cx, cy - 0.42f * s)
        p.cubicTo(cx + 0.38f * s, cy - 0.12f * s, cx + 0.28f * s, cy + 0.22f * s, cx, cy + 0.4f * s)
        p.cubicTo(cx - 0.28f * s, cy + 0.22f * s, cx - 0.38f * s, cy - 0.12f * s, cx, cy - 0.42f * s)
        p.close()
        canvas.drawPath(p, paint)
    }

    private fun renderClusterBubble(context: Context, count: Int): Bitmap {
        val dm = context.resources.displayMetrics
        val density = dm.density
        val label = count.toString()
        val textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, CLUSTER_TEXT_SP, dm)
        val textPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = Color.WHITE
                this.textSize = textSize
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                isFakeBoldText = true
                textAlign = Paint.Align.LEFT
            }
        val tw = textPaint.measureText(label)
        val fm = textPaint.fontMetrics

        val minW = CLUSTER_MIN_W_DP * density
        val padH = CLUSTER_PAD_H_DP * density
        val w = max(minW, tw + padH * 2f)
        val h = CLUSTER_H_DP * density
        val r = CLUSTER_CORNER_DP * density
        val bw = ceil(w).toInt()
        val bh = ceil(h).toInt()
        val bmp = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)

        val rect = RectF(0f, 0f, bw.toFloat(), bh.toFloat())
        val fillPaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = clusterFillArgb
            }
        val strokePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = BORDER_DP * density
                color = clusterBorderArgb
            }
        canvas.drawRoundRect(rect, r, r, fillPaint)
        canvas.drawRoundRect(
            RectF(
                strokePaint.strokeWidth / 2f,
                strokePaint.strokeWidth / 2f,
                bw.toFloat() - strokePaint.strokeWidth / 2f,
                bh.toFloat() - strokePaint.strokeWidth / 2f,
            ),
            r - strokePaint.strokeWidth / 2f,
            r - strokePaint.strokeWidth / 2f,
            strokePaint,
        )

        val tx = (bw - tw) / 2f
        val ty = bh / 2f - (fm.ascent + fm.descent) / 2f
        canvas.drawText(label, tx, ty, textPaint)
        return bmp
    }
}
