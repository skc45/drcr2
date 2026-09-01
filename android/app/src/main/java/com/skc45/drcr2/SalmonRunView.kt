package com.skc45.drcr2

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.sin

class SalmonRunView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : View(context, attrs) {

    enum class Perimeter { TOP, BOTTOM, LEFT, RIGHT }

    private data class Salmon(
        var x: Float,
        var y: Float,
        var speed: Float,
        val cruise: Float,
        val scale: Float,
        val hueShift: Float,
        var facingRight: Boolean,
        val bob: Float,
        val phase: Float,
        var panic: Float,
    )

    private data class Bubble(
        var x: Float,
        var y: Float,
        var r: Float,
        var speed: Float,
    )

    private data class Tuna(
        var x: Float,
        var y: Float,
        var vx: Float,
        var vy: Float,
        val scale: Float,
        val phase: Float,
        var life: Float,
        var target: Int,
        val edge: Perimeter,
    )

    private data class Wake(
        val edge: Perimeter,
        var age: Float,
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
    private val wakePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val finPaint = Paint(Paint.ANTI_ALIAS_FLAG)

    private val fish = Path()
    private val salmon = mutableListOf<Salmon>()
    private val bubbles = mutableListOf<Bubble>()
    private val tuna = mutableListOf<Tuna>()
    private val wakes = mutableListOf<Wake>()
    private val rng = java.util.Random()
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

    fun launchTuna(op: String) {
        val edge = when (op) {
            "+" -> Perimeter.TOP
            "-" -> Perimeter.BOTTOM
            "*" -> Perimeter.LEFT
            "/" -> Perimeter.RIGHT
            else -> return
        }
        spawnTuna(edge)
    }

    private fun spawnTuna(edge: Perimeter) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        wakes += Wake(edge, 0f)
        repeat(3) { i ->
            val along = (i + 1f) / 4f + (rng.nextFloat() - 0.5f) * 0.12f
            val rush = 210f + rng.nextFloat() * 80f
            val jitter = (rng.nextFloat() - 0.5f) * 40f
            val spawned = when (edge) {
                Perimeter.TOP -> Tuna(
                    x = w * along.coerceIn(0.08f, 0.92f),
                    y = -90f,
                    vx = jitter,
                    vy = rush,
                    scale = 1.05f + rng.nextFloat() * 0.35f,
                    phase = rng.nextFloat() * 6.28f,
                    life = 4.6f,
                    target = i % salmon.size.coerceAtLeast(1),
                    edge = edge,
                )
                Perimeter.BOTTOM -> Tuna(
                    x = w * along.coerceIn(0.08f, 0.92f),
                    y = h + 90f,
                    vx = jitter,
                    vy = -rush,
                    scale = 1.05f + rng.nextFloat() * 0.35f,
                    phase = rng.nextFloat() * 6.28f,
                    life = 4.6f,
                    target = i % salmon.size.coerceAtLeast(1),
                    edge = edge,
                )
                Perimeter.LEFT -> Tuna(
                    x = -90f,
                    y = h * along.coerceIn(0.12f, 0.72f),
                    vx = rush,
                    vy = jitter,
                    scale = 1.05f + rng.nextFloat() * 0.35f,
                    phase = rng.nextFloat() * 6.28f,
                    life = 4.6f,
                    target = i % salmon.size.coerceAtLeast(1),
                    edge = edge,
                )
                Perimeter.RIGHT -> Tuna(
                    x = w + 90f,
                    y = h * along.coerceIn(0.12f, 0.72f),
                    vx = -rush,
                    vy = jitter,
                    scale = 1.05f + rng.nextFloat() * 0.35f,
                    phase = rng.nextFloat() * 6.28f,
                    life = 4.6f,
                    target = i % salmon.size.coerceAtLeast(1),
                    edge = edge,
                )
            }
            tuna += spawned
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
        tuna.clear()
        wakes.clear()
        if (w <= 0f || h <= 0f) return
        val seedRng = java.util.Random(7)
        repeat(7) {
            val cruise = 48f + seedRng.nextFloat() * 90f
            salmon += Salmon(
                x = seedRng.nextFloat() * w,
                y = h * (0.18f + seedRng.nextFloat() * 0.64f),
                speed = cruise,
                cruise = cruise,
                scale = 0.7f + seedRng.nextFloat() * 0.7f,
                hueShift = seedRng.nextFloat(),
                facingRight = seedRng.nextBoolean(),
                bob = 10f + seedRng.nextFloat() * 16f,
                phase = seedRng.nextFloat() * 6.28f,
                panic = 0f,
            )
        }
        repeat(18) {
            bubbles += Bubble(
                x = seedRng.nextFloat() * w,
                y = seedRng.nextFloat() * h,
                r = 3f + seedRng.nextFloat() * 7f,
                speed = 18f + seedRng.nextFloat() * 36f,
            )
        }
    }

    private fun step(dt: Float) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return
        val t = SystemClockSeconds()
        stepTuna(dt, w, h)
        stepWakes(dt)
        for (s in salmon) {
            fleeFromTuna(s)
            val dir = if (s.facingRight) 1f else -1f
            val rush = if (s.panic > 0f) 2.6f else 1f
            s.x += dir * s.speed * rush * dt
            s.y += sin(t * 1.6f + s.phase) * 8f * dt
            s.y = s.y.coerceIn(h * 0.12f, h * 0.88f)
            s.panic = (s.panic - dt).coerceAtLeast(0f)
            if (s.panic == 0f) s.speed += (s.cruise - s.speed) * 2.4f * dt
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

    private fun stepWakes(dt: Float) {
        val it = wakes.iterator()
        while (it.hasNext()) {
            val wake = it.next()
            wake.age += dt
            if (wake.age > 0.85f) it.remove()
        }
    }

    private fun stepTuna(dt: Float, w: Float, h: Float) {
        val it = tuna.iterator()
        while (it.hasNext()) {
            val hunter = it.next()
            hunter.life -= dt
            val hunting = hunter.life > 1.15f
            if (hunting && salmon.isNotEmpty()) {
                val prey = salmon[hunter.target % salmon.size]
                steerToward(hunter, prey.x, prey.y, 320f, dt)
            } else {
                val exit = exitPoint(hunter.edge, w, h)
                steerToward(hunter, exit.first, exit.second, 380f, dt)
            }
            hunter.x += hunter.vx * dt
            hunter.y += hunter.vy * dt
            if (hunter.life <= 0f || offRiver(hunter, w, h)) it.remove()
        }
    }

    private fun steerToward(hunter: Tuna, tx: Float, ty: Float, speed: Float, dt: Float) {
        val dx = tx - hunter.x
        val dy = ty - hunter.y
        val len = hypot(dx, dy).coerceAtLeast(1f)
        val ax = dx / len * speed - hunter.vx
        val ay = dy / len * speed - hunter.vy
        hunter.vx += ax * 3.4f * dt
        hunter.vy += ay * 3.4f * dt
    }

    private fun exitPoint(edge: Perimeter, w: Float, h: Float): Pair<Float, Float> = when (edge) {
        Perimeter.TOP -> Pair(w * 0.5f, h + 160f)
        Perimeter.BOTTOM -> Pair(w * 0.5f, -160f)
        Perimeter.LEFT -> Pair(w + 160f, h * 0.4f)
        Perimeter.RIGHT -> Pair(-160f, h * 0.4f)
    }

    private fun offRiver(hunter: Tuna, w: Float, h: Float): Boolean =
        hunter.x < -140f || hunter.x > w + 140f || hunter.y < -140f || hunter.y > h + 140f

    private fun fleeFromTuna(s: Salmon) {
        var nearest = Float.MAX_VALUE
        var awayX = 0f
        for (hunter in tuna) {
            val d = hypot(s.x - hunter.x, s.y - hunter.y)
            if (d < nearest) {
                nearest = d
                awayX = s.x - hunter.x
            }
        }
        if (nearest < 130f) {
            s.panic = 0.7f
            s.speed = s.cruise * 2.4f
            if (awayX != 0f) s.facingRight = awayX > 0f
        }
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        canvas.drawRect(0f, 0f, w, h, waterPaint)
        canvas.drawRect(0f, 0f, w, h * 0.3f, gleamPaint)
        drawWakes(canvas, w, h)
        drawWeeds(canvas, w, h)
        for (b in bubbles) canvas.drawCircle(b.x, b.y, b.r, bubblePaint)
        val t = SystemClockSeconds()
        for (s in salmon) drawSalmon(canvas, s, t)
        for (hunter in tuna) drawTuna(canvas, hunter, t)
    }

    private fun drawWakes(canvas: Canvas, w: Float, h: Float) {
        for (wake in wakes) {
            val fade = (1f - wake.age / 0.85f).coerceIn(0f, 1f)
            val band = 36f + fade * 42f
            wakePaint.color = (0x00E8F6FA or ((0x88 * fade).toInt() shl 24))
            when (wake.edge) {
                Perimeter.TOP -> canvas.drawRect(0f, 0f, w, band, wakePaint)
                Perimeter.BOTTOM -> canvas.drawRect(0f, h - band, w, h, wakePaint)
                Perimeter.LEFT -> canvas.drawRect(0f, 0f, band, h, wakePaint)
                Perimeter.RIGHT -> canvas.drawRect(w - band, 0f, w, h, wakePaint)
            }
        }
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

    private fun drawTuna(canvas: Canvas, hunter: Tuna, t: Float) {
        bodyPaint.color = 0xFF1F3F5B.toInt()
        bellyPaint.color = 0xFFD7E6EE.toInt()
        accentPaint.color = 0xFF163044.toInt()
        finPaint.color = 0xFFF0C14A.toInt()

        val angle = Math.toDegrees(atan2(hunter.vy, hunter.vx).toDouble()).toFloat()
        canvas.save()
        canvas.translate(hunter.x, hunter.y)
        canvas.rotate(angle)
        canvas.scale(hunter.scale, hunter.scale)

        val flap = sin(t * 16f + hunter.phase) * 14f
        fish.reset()
        fish.moveTo(-62f, 0f)
        fish.quadTo(-20f, -20f, 22f, -14f)
        fish.quadTo(52f, -6f, 68f, 0f)
        fish.quadTo(52f, 6f, 22f, 14f)
        fish.quadTo(-20f, 20f, -62f, 0f)
        canvas.drawPath(fish, bodyPaint)

        fish.reset()
        fish.moveTo(-28f, 3f)
        fish.quadTo(16f, 16f, 46f, 2f)
        fish.quadTo(16f, 8f, -28f, 3f)
        canvas.drawPath(fish, bellyPaint)

        fish.reset()
        fish.moveTo(-58f, 0f)
        fish.lineTo(-88f, -22f + flap)
        fish.lineTo(-78f, 0f)
        fish.lineTo(-88f, 22f - flap)
        fish.close()
        canvas.drawPath(fish, accentPaint)

        fish.reset()
        fish.moveTo(-4f, -12f)
        fish.quadTo(10f, -36f, 22f, -10f)
        canvas.drawPath(fish, finPaint)

        fish.reset()
        fish.moveTo(8f, 10f)
        fish.quadTo(18f, 26f, 28f, 8f)
        canvas.drawPath(fish, finPaint)

        canvas.drawCircle(48f, -3f, 3.2f, eyePaint)
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
