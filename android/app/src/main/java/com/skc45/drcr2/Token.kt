package com.skc45.drcr2

data class Token(val type: String = "op", val value: String) {
    fun toJson(): String = """{"type":"$type","value":"$value"}"""
}

private val OPS = listOf("+", "-", "*", "/")

fun generateToken(value: String): Token? =
    if (value in OPS) Token(value = value) else null

fun generateTokens(): Map<String, Token> =
    OPS.associateWith { Token(value = it) }
