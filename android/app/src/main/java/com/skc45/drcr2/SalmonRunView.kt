package com.skc45.drcr2

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.util.AttributeSet
import android.view.View
import kotlin.math.PI
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
        var gunAngle: Float,
        var reload: Float,
        val reloadTime: Float,
        var recoil: Float,
        var dead: Boolean,
        var respawn: Float,
        var fade: Float,
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

    private data class Shell(
        var x: Float,
        var y: Float,
        var vx: Float,
        var vy: Float,
        var life: Float,
    )

    private data class Flash(
        var x: Float,
        var y: Float,
        var angle: Float,
        var age: Float,
    )

    private data class Nuke(
        var x: Float,
        var y: Float,
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
    private val steelPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val brassPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val shellPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val flashPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3.2f
        strokeCap = Paint.Cap.ROUND
    }
    private val ringBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3.2f
        color = 0x33211610.toInt()
    }
    private val vestPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val nukePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val hazardPaint = Paint(Paint.ANTI_ALIAS_FLAG)

    private val fish = Path()
    private val ringBox = RectF()
    private val salmon = mutableListOf<Salmon>()
    private val bubbles = mutableListOf<Bubble>()
    private val tuna = mutableListOf<Tuna>()
    private val wakes = mutableListOf<Wake>()
    private val shells = mutableListOf<Shell>()
    private val flashes = mutableListOf<Flash>()
    private val nukes = mutableListOf<Nuke>()
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
        shells.clear()
        flashes.clear()
        nukes.clear()
        if (w <= 0f || h <= 0f) return
        val seedRng = java.util.Random(7)
        repeat(7) {
            val cruise = 48f + seedRng.nextFloat() * 90f
            val facingRight = seedRng.nextBoolean()
            val reloadTime = 2.7f + seedRng.nextFloat() * 0.9f
            salmon += Salmon(
                x = seedRng.nextFloat() * w,
                y = h * (0.18f + seedRng.nextFloat() * 0.64f),
                speed = cruise,
                cruise = cruise,
                scale = 0.7f + seedRng.nextFloat() * 0.7f,
                hueShift = seedRng.nextFloat(),
                facingRight = facingRight,
                bob = 10f + seedRng.nextFloat() * 16f,
                phase = seedRng.nextFloat() * 6.28f,
                panic = 0f,
                gunAngle = if (facingRight) 0f else PI.toFloat(),
                reload = seedRng.nextFloat() * reloadTime,
                reloadTime = reloadTime,
                recoil = 0f,
                dead = false,
                respawn = 0f,
                fade = 1f,
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
        stepNukes(dt)
        stepArtillery(dt, t, w, h)
        for (s in salmon) {
            if (s.dead) {
                s.fade = (s.fade - dt * 2.4f).coerceAtLeast(0f)
                s.y += 46f * dt
                s.respawn -= dt
                if (s.respawn <= 0f) respawnSalmon(s, w, h)
                continue
            }
            s.fade = (s.fade + dt * 2.8f).coerceAtMost(1f)
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

    private fun stepArtillery(dt: Float, t: Float, w: Float, h: Float) {
        for (s in salmon) {
            if (s.dead) continue
            val aim = aimPoint(s)
            s.gunAngle = lerpAngle(s.gunAngle, atan2(aim.second - salmonWorldY(s, t), aim.first - s.x), (1.6f * dt).coerceIn(0f, 1f))
            s.recoil = (s.recoil - dt * 2.8f).coerceAtLeast(0f)
            s.reload -= dt
            if (s.reload <= 0f) {
                fire(s, t)
                s.reload = s.reloadTime
            }
        }
        val shellIt = shells.iterator()
        while (shellIt.hasNext()) {
            val shot = shellIt.next()
            shot.x += shot.vx * dt
            shot.y += shot.vy * dt
            shot.life -= dt
            var hit = false
            val tunaIt = tuna.iterator()
            while (tunaIt.hasNext()) {
                val hunter = tunaIt.next()
                if (hypot(hunter.x - shot.x, hunter.y - shot.y) < 28f * hunter.scale) {
                    hunter.life -= 1.8f
                    hunter.vx += shot.vx * 0.18f
                    hunter.vy += shot.vy * 0.18f
                    flashes += Flash(shot.x, shot.y, atan2(shot.vy, shot.vx), 0f)
                    if (hunter.life <= 0f) {
                        detonate(hunter)
                        tunaIt.remove()
                    }
                    hit = true
                    break
                }
            }
            if (hit || shot.life <= 0f || shot.x < -40f || shot.x > w + 40f || shot.y < -40f || shot.y > h + 40f) {
                shellIt.remove()
            }
        }
        val flashIt = flashes.iterator()
        while (flashIt.hasNext()) {
            val flash = flashIt.next()
            flash.age += dt
            if (flash.age > 0.22f) flashIt.remove()
        }
    }

    private fun fire(s: Salmon, t: Float) {
        val y = salmonWorldY(s, t)
        val reach = (36f - s.recoil * 10f) * s.scale
        val mx = s.x + cos(s.gunAngle) * reach
        val my = y + sin(s.gunAngle) * reach
        val speed = 240f
        shells += Shell(mx, my, cos(s.gunAngle) * speed, sin(s.gunAngle) * speed, 2.4f)
        flashes += Flash(mx, my, s.gunAngle, 0f)
        s.recoil = 1f
    }

    private fun aimPoint(s: Salmon): Pair<Float, Float> {
        var best: Tuna? = null
        var nearest = Float.MAX_VALUE
        for (hunter in tuna) {
            val d = hypot(hunter.x - s.x, hunter.y - s.y)
            if (d < nearest) {
                nearest = d
                best = hunter
            }
        }
        if (best != null) return Pair(best.x, best.y)
        val ahead = if (s.facingRight) 180f else -180f
        return Pair(s.x + ahead, s.y)
    }

    private fun salmonWorldY(s: Salmon, t: Float): Float =
        s.y + sin(t * 2.2f + s.phase) * s.bob

    private fun lerpAngle(from: Float, to: Float, amount: Float): Float {
        var delta = to - from
        val half = PI.toFloat()
        val tau = half * 2f
        while (delta > half) delta -= tau
        while (delta < -half) delta += tau
        return from + delta * amount
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
            val prey = livingSalmon(hunter.target)
            if (prey != null) {
                steerToward(hunter, prey.x, prey.y, 360f, dt)
                if (hypot(hunter.x - prey.x, hunter.y - prey.y) < 56f) {
                    detonate(hunter)
                    it.remove()
                    continue
                }
            } else {
                steerToward(hunter, w * 0.5f, h * 0.45f, 300f, dt)
            }
            hunter.x += hunter.vx * dt
            hunter.y += hunter.vy * dt
            if (hunter.life <= 0f) {
                detonate(hunter)
                it.remove()
            } else if (offRiver(hunter, w, h)) {
                it.remove()
            }
        }
    }

    private fun livingSalmon(preferred: Int): Salmon? {
        if (salmon.isEmpty()) return null
        val start = ((preferred % salmon.size) + salmon.size) % salmon.size
        for (i in salmon.indices) {
            val s = salmon[(start + i) % salmon.size]
            if (!s.dead) return s
        }
        return null
    }

    private fun killSalmon(s: Salmon) {
        if (s.dead) return
        s.dead = true
        s.respawn = 1.5f + rng.nextFloat() * 1.1f
        s.recoil = 0f
    }

    private fun respawnSalmon(s: Salmon, w: Float, h: Float) {
        s.dead = false
        s.fade = 0f
        s.panic = 0f
        s.speed = s.cruise
        s.reload = s.reloadTime * 0.35f
        s.recoil = 0f
        s.facingRight = rng.nextBoolean()
        s.gunAngle = if (s.facingRight) 0f else PI.toFloat()
        when (rng.nextInt(4)) {
            0 -> {
                s.x = rng.nextFloat() * w
                s.y = -36f
            }
            1 -> {
                s.x = rng.nextFloat() * w
                s.y = h + 36f
            }
            2 -> {
                s.x = -40f
                s.y = h * (0.18f + rng.nextFloat() * 0.56f)
                s.facingRight = true
            }
            else -> {
                s.x = w + 40f
                s.y = h * (0.18f + rng.nextFloat() * 0.56f)
                s.facingRight = false
            }
        }
    }

    private fun detonate(hunter: Tuna) {
        nukes += Nuke(hunter.x, hunter.y, 0f)
        for (s in salmon) {
            if (!s.dead && hypot(s.x - hunter.x, s.y - hunter.y) < 124f) killSalmon(s)
        }
    }

    private fun stepNukes(dt: Float) {
        val it = nukes.iterator()
        while (it.hasNext()) {
            val nuke = it.next()
            nuke.age += dt
            if (nuke.age > 0.85f) it.remove()
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
        if (nearest < 70f) {
            s.panic = 0.45f
            s.speed = s.cruise * 1.8f
            if (awayX != 0f) s.facingRight = awayX > 0f
        }
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        canvas.save()
        canvas.clipRect(0f, 0f, w, h)
        canvas.drawRect(0f, 0f, w, h, waterPaint)
        canvas.drawRect(0f, 0f, w, h * 0.3f, gleamPaint)
        drawWakes(canvas, w, h)
        drawWeeds(canvas, w, h)
        for (b in bubbles) canvas.drawCircle(b.x, b.y, b.r, bubblePaint)
        val t = SystemClockSeconds()
        for (s in salmon) drawSalmon(canvas, s, t)
        for (hunter in tuna) drawTuna(canvas, hunter, t)
        for (shot in shells) drawShell(canvas, shot)
        for (flash in flashes) drawFlash(canvas, flash)
        for (nuke in nukes) drawNuke(canvas, nuke)
        canvas.restore()
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
        val alpha = (255f * s.fade).toInt().coerceIn(0, 255)
        bodyPaint.color = mix
        bodyPaint.alpha = alpha
        bellyPaint.color = belly
        bellyPaint.alpha = alpha
        accentPaint.color = 0xFFD4573C.toInt()
        accentPaint.alpha = alpha
        eyePaint.alpha = alpha

        val worldY = salmonWorldY(s, t)
        canvas.save()
        canvas.translate(s.x, worldY)
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
        bodyPaint.alpha = 255
        bellyPaint.alpha = 255
        accentPaint.alpha = 255
        eyePaint.alpha = 255
        if (!s.dead) drawArtillery(canvas, s, worldY)
    }

    private fun drawArtillery(canvas: Canvas, s: Salmon, worldY: Float) {
        val spent = (1f - s.reload / s.reloadTime).coerceIn(0f, 1f)
        val bolt = when {
            spent < 0.12f -> 0f
            spent < 0.40f -> (spent - 0.12f) / 0.28f
            spent < 0.70f -> 1f
            spent < 0.88f -> 1f - (spent - 0.70f) / 0.18f
            else -> 0f
        }
        val feed = when {
            spent < 0.28f -> 0f
            spent < 0.62f -> (spent - 0.28f) / 0.34f
            spent < 0.84f -> 1f
            else -> 0f
        }
        val hatch = when {
            spent < 0.16f -> spent / 0.16f
            spent < 0.78f -> 1f
            else -> (1f - (spent - 0.78f) / 0.22f).coerceAtLeast(0f)
        }

        steelPaint.color = 0xFF3A4650.toInt()
        brassPaint.color = 0xFFC4A15A.toInt()
        shellPaint.color = 0xFFD4B06A.toInt()

        canvas.save()
        canvas.translate(s.x, worldY)
        canvas.scale(s.scale, s.scale)

        fish.reset()
        fish.moveTo(-16f, -6f)
        fish.lineTo(14f, -8f)
        fish.lineTo(16f, 2f)
        fish.lineTo(-18f, 4f)
        fish.close()
        canvas.drawPath(fish, steelPaint)
        canvas.drawRect(-10f, 2f, 10f, 7f, brassPaint)

        canvas.save()
        canvas.rotate(Math.toDegrees(s.gunAngle.toDouble()).toFloat())

        val kick = s.recoil * 9f
        canvas.drawRoundRect(-18f - kick, -7f, 8f - kick, 7f, 3f, 3f, steelPaint)
        canvas.drawRoundRect(4f - kick, -4.2f, 34f - kick, 4.2f, 2.2f, 2.2f, steelPaint)
        canvas.drawCircle(-8f - kick, 0f, 6.5f, brassPaint)

        val boltX = -14f - kick - bolt * 12f
        canvas.drawRoundRect(boltX - 7f, -3.2f, boltX + 5f, 3.2f, 1.6f, 1.6f, brassPaint)
        canvas.drawCircle(boltX - 7f, 0f, 3.4f, steelPaint)

        canvas.save()
        canvas.rotate(-42f * hatch)
        canvas.drawRoundRect(-6f - kick, -11f, 6f - kick, -6f, 1.4f, 1.4f, brassPaint)
        canvas.restore()

        if (feed > 0f) {
            val sy = 10f - feed * 12f
            canvas.drawRoundRect(-4f - kick, sy - 3f, 6f - kick, sy + 3f, 1.5f, 1.5f, shellPaint)
        }

        ringBgPaint.strokeWidth = 2.6f
        ringPaint.strokeWidth = 2.6f
        ringPaint.color = 0xFFE8C56A.toInt()
        ringBox.set(-22f, -22f, 8f, 8f)
        canvas.drawArc(ringBox, -90f, 360f, false, ringBgPaint)
        canvas.drawArc(ringBox, -90f, 360f * spent, false, ringPaint)
        canvas.restore()
        canvas.restore()
    }

    private fun drawShell(canvas: Canvas, shot: Shell) {
        val angle = Math.toDegrees(atan2(shot.vy, shot.vx).toDouble()).toFloat()
        canvas.save()
        canvas.translate(shot.x, shot.y)
        canvas.rotate(angle)
        shellPaint.color = 0xFFE6C36A.toInt()
        canvas.drawRoundRect(-8f, -3.1f, 8f, 3.1f, 2f, 2f, shellPaint)
        steelPaint.color = 0xFF2C353C.toInt()
        canvas.drawCircle(7.2f, 0f, 2.6f, steelPaint)
        canvas.restore()
    }

    private fun drawFlash(canvas: Canvas, flash: Flash) {
        val fade = (1f - flash.age / 0.22f).coerceIn(0f, 1f)
        canvas.save()
        canvas.translate(flash.x, flash.y)
        canvas.rotate(Math.toDegrees(flash.angle.toDouble()).toFloat())
        flashPaint.color = (0x00FFC14A or ((0xEE * fade).toInt() shl 24))
        canvas.drawCircle(6f, 0f, 10f * fade + 4f, flashPaint)
        flashPaint.color = (0x00FFF4C8 or ((0xCC * fade).toInt() shl 24))
        canvas.drawCircle(12f, 0f, 5f * fade + 2f, flashPaint)
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
        drawNukeVest(canvas, hunter, t)
        canvas.restore()
    }

    private fun drawNukeVest(canvas: Canvas, hunter: Tuna, t: Float) {
        vestPaint.color = 0xFF1A1C14.toInt()
        canvas.drawRoundRect(-16f, 0f, 18f, 18f, 3f, 3f, vestPaint)
        vestPaint.color = 0xFF3A3D2A.toInt()
        canvas.drawRoundRect(-13f, 2f, 15f, 15f, 2f, 2f, vestPaint)
        val pulse = 0.55f + 0.45f * (0.5f + 0.5f * sin(t * 8f + hunter.phase))
        hazardPaint.color = (0x00F0D000 or ((0xFF * pulse).toInt() shl 24))
        canvas.drawCircle(1f, 8f, 5.2f, hazardPaint)
        hazardPaint.color = 0xFF1A1C14.toInt()
        canvas.drawCircle(1f, 8f, 1.5f, hazardPaint)
        for (i in 0 until 3) {
            val a = i * 2.094f - 0.4f
            canvas.drawCircle(1f + cos(a) * 3.1f, 8f + sin(a) * 3.1f, 1.7f, hazardPaint)
        }
        vestPaint.color = 0xFFE24B3A.toInt()
        vestPaint.alpha = (80 + 175 * pulse).toInt()
        canvas.drawCircle(-10f, 4f, 2.1f, vestPaint)
        vestPaint.alpha = 255
    }

    private fun drawNuke(canvas: Canvas, nuke: Nuke) {
        val u = (nuke.age / 0.85f).coerceIn(0f, 1f)
        val fade = (1f - u).coerceIn(0f, 1f)
        val r = 18f + u * 168f
        nukePaint.color = (0x00FF6A1A or ((0x55 * fade).toInt() shl 24))
        canvas.drawCircle(nuke.x, nuke.y, r, nukePaint)
        nukePaint.color = (0x00FFC14A or ((0x88 * fade).toInt() shl 24))
        canvas.drawCircle(nuke.x, nuke.y, r * 0.62f, nukePaint)
        nukePaint.color = (0x00FFF4C8 or ((0xCC * fade).toInt() shl 24))
        canvas.drawCircle(nuke.x, nuke.y, r * 0.28f, nukePaint)
        nukePaint.style = Paint.Style.STROKE
        nukePaint.strokeWidth = 10f * fade
        nukePaint.color = (0x00FFE27A or ((0xAA * fade).toInt() shl 24))
        canvas.drawCircle(nuke.x, nuke.y, r * 0.86f, nukePaint)
        nukePaint.style = Paint.Style.FILL
        if (u < 0.45f) {
            val mark = (1f - u / 0.45f)
            hazardPaint.color = (0x00F0D000 or ((0xEE * mark).toInt() shl 24))
            canvas.drawCircle(nuke.x, nuke.y, 10f, hazardPaint)
            hazardPaint.color = (0x001A1C14 or ((0xEE * mark).toInt() shl 24))
            canvas.drawCircle(nuke.x, nuke.y, 3f, hazardPaint)
        }
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
