package com.skc45.drcr2

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import kotlin.math.cos
import kotlin.math.sin

class SalmonRunView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    private data class Salmon(
        var x: Float,
        var y: Float,
        var speed: Float,
        val scale: Float,
        val hueShift: Float,
        var facingRight: Boolean,
        val bob: Float,
        val phase: Float,
    )

    private data class Bubble(
        var x: Float,
        var y: Float,
        var r: Float,
        var speed: Float,
    )

    private val waterPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val gleamPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val bellyPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val accentPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val eyePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFF1A120C.toInt() }
    private val bubblePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0x66E8F6FA.toInt()
        style = Paint.Style.STROKE
        strokeWidth = 2.5f
    }
    private val weedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0x6630A070.toInt()
        style = Paint.Style.STROKE
        strokeWidth = 6f
        strokeCap = Paint.Cap.ROUND
    }

    private val fish = Path()
    private val salmon = mutableListOf<Salmon>()
    private val bubbles = mutableListOf<Bubble>()
    private var running = false
    private var lastNs = 0L

    private val tick = object : Runnable {
        override fun run() {
            if (!running) return
            val now = System.nanoTime()
            if (lastNs != 0L) {
                val dt = ((now - lastNs) / 1_000_000_000f).coerceAtMost(0.04f)
                step(dt)
            }
            lastNs = now
            invalidate()
            postOnAnimation(this)
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        waterPaint.shader = LinearGradient(
            0f, 0f, 0f, h.toFloat(),
            intArrayOf(0xFF08323C.toInt(), 0xFF0D4A58.toInt(), 0xFF156575.toInt(), 0xFF0A3A46.toInt()),
            floatArrayOf(0f, 0.35f, 0.7f, 1f),
            Shader.TileMode.CLAMP,
        )
        gleamPaint.shader = LinearGradient(
            0f, 0f, 0f, h * 0.28f,
            intArrayOf(0x33FFF6D8.toInt(), 0x00000000),
            null,
            Shader.TileMode.CLAMP,
        )
        seed(w.toFloat(), h.toFloat())
    }

    private fun seed(w: Float, h: Float) {
        salmon.clear()
        bubbles.clear()
        if (w <= 0f || h <= 0f) return
        val rng = java.util.Random(7)
        repeat(7) {
            salmon += Salmon(
                x = rng.nextFloat() * w,
                y = h * (0.18f + rng.nextFloat() * 0.64f),
                speed = 48f + rng.nextFloat() * 90f,
                scale = 0.7f + rng.nextFloat() * 0.7f,
                hueShift = rng.nextFloat(),
                facingRight = rng.nextBoolean(),
                bob = 10f + rng.nextFloat() * 16f,
                phase = rng.nextFloat() * 6.28f,
            )
        }
        repeat(18) {
            bubbles += Bubble(
                x = rng.nextFloat() * w,
                y = rng.nextFloat() * h,
                r = 3f + rng.nextFloat() * 7f,
                speed = 18f + rng.nextFloat() * 36f,
            )
        }
    }

    private fun step(dt: Float) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val t = SystemClockSeconds()
        for (s in salmon) {
            val dir = if (s.facingRight) 1f else -1f
            s.x += dir * s.speed * dt
            s.y += sin(t * 1.6f + s.phase) * 8f * dt
            s.y = s.y.coerceIn(h * 0.12f, h * 0.88f)
            val span = 70f * s.scale
            if (s.x > w + span) {
                s.facingRight = false
                s.x = w + span
            } else if (s.x < -span) {
                s.facingRight = true
                s.x = -span
            }
        }
        for (b in bubbles) {
            b.y -= b.speed * dt
            b.x += sin(t * 2f + b.x) * 10f * dt
            if (b.y < -12f) {
                b.y = h + 12f
                b.x = (b.x % w + w) % w
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        canvas.drawRect(0f, 0f, w, h, waterPaint)
        canvas.drawRect(0f, 0f, w, h * 0.3f, gleamPaint)
        drawWeeds(canvas, w, h)
        for (b in bubbles) canvas.drawCircle(b.x, b.y, b.r, bubblePaint)
        val t = SystemClockSeconds()
        for (s in salmon) drawSalmon(canvas, s, t)
    }

    private fun drawWeeds(canvas: Canvas, w: Float, h: Float) {
        val t = SystemClockSeconds()
        var x = 24f
        while (x < w) {
            val path = Path()
            path.moveTo(x, h)
            path.cubicTo(
                x + sin(t + x) * 18f, h * 0.72f,
                x - cos(t * 0.8f + x) * 22f, h * 0.45f,
                x + sin(t * 1.1f + x * 0.02f) * 16f, h * 0.28f,
            )
            canvas.drawPath(path, weedPaint)
            x += 56f
        }
    }

    private fun drawSalmon(canvas: Canvas, s: Salmon, t: Float) {
        val body = 0xFFE07A5F.toInt()
        val blush = 0xFFF4A698.toInt()
        val belly = 0xFFF6D7C5.toInt()
        val mix = if (s.hueShift > 0.5f) blush else body
        bodyPaint.color = mix
        bellyPaint.color = belly
        accentPaint.color = 0xFFD4573C.toInt()

        canvas.save()
        canvas.translate(s.x, s.y + sin(t * 2.2f + s.phase) * s.bob)
        if (!s.facingRight) canvas.scale(-1f, 1f)
        canvas.scale(s.scale, s.scale)

        val flap = sin(t * 10f + s.phase) * 10f
        fish.reset()
        fish.moveTo(-52f, 0f)
        fish.quadTo(-18f, -22f, 18f, -16f)
        fish.quadTo(44f, -8f, 50f, 0f)
        fish.quadTo(44f, 8f, 18f, 16f)
        fish.quadTo(-18f, 22f, -52f, 0f)
        canvas.drawPath(fish, bodyPaint)

        fish.reset()
        fish.moveTo(-28f, 4f)
        fish.quadTo(8f, 18f, 36f, 4f)
        fish.quadTo(8f, 10f, -28f, 4f)
        canvas.drawPath(fish, bellyPaint)

        fish.reset()
        fish.moveTo(-50f, 0f)
        fish.lineTo(-74f, -16f + flap)
        fish.lineTo(-68f, 0f)
        fish.lineTo(-74f, 16f - flap)
        fish.close()
        canvas.drawPath(fish, accentPaint)

        fish.reset()
        fish.moveTo(4f, -14f)
        fish.quadTo(14f, -30f, 22f, -12f)
        canvas.drawPath(fish, accentPaint)

        canvas.drawCircle(34f, -4f, 3.4f, eyePaint)
        canvas.restore()
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        running = true
        lastNs = 0L
        postOnAnimation(tick)
    }

    override fun onDetachedFromWindow() {
        running = false
        removeCallbacks(tick)
        super.onDetachedFromWindow()
    }

    private fun SystemClockSeconds(): Float = System.nanoTime() / 1_000_000_000f
}
