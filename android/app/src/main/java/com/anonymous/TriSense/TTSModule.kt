package com.anonymous.TriSense

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.*
import java.util.*

class TTSModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null

    init {
        tts = TextToSpeech(reactContext, this)
    }

    override fun getName(): String {
        return "TTSModule"
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
        }
    }

    @ReactMethod
    fun speak(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "tts-id")
    }
}