package com.skc45.drcr2

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.google.android.material.card.MaterialCardView

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        findViewById<MaterialCardView>(R.id.riverBox).clipToOutline = true

        val out = findViewById<TextView>(R.id.tokenOut)
        val river = findViewById<SalmonRunView>(R.id.salmonRun)
        fun show(op: String, attack: Boolean) {
            val token = generateToken(op) ?: return
            out.text = token.toJson()
            if (attack) river.launchTuna(op)
        }

        findViewById<Button>(R.id.opPlus).setOnClickListener { show("+", attack = true) }
        findViewById<Button>(R.id.opMinus).setOnClickListener { show("-", attack = true) }
        findViewById<Button>(R.id.opStar).setOnClickListener { show("*", attack = true) }
        findViewById<Button>(R.id.opSlash).setOnClickListener { show("/", attack = true) }

        show("+", attack = false)
    }
}
