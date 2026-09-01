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
        fun show(op: String) {
            val token = generateToken(op) ?: return
            out.text = token.toJson()
        }

        findViewById<Button>(R.id.opPlus).setOnClickListener { show("+") }
        findViewById<Button>(R.id.opMinus).setOnClickListener { show("-") }
        findViewById<Button>(R.id.opStar).setOnClickListener { show("*") }
        findViewById<Button>(R.id.opSlash).setOnClickListener { show("/") }

        show("+")
    }
}
