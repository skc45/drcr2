package com.skc45.drcr2

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

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
