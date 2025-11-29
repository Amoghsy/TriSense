package com.anonymous.TriSense

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechModule(private val reactCtx: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactCtx), RecognitionListener {

    private var recognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName() = "SpeechModule"

    @ReactMethod
    fun startListening() {
        mainHandler.post {                      // <<< FIX: runs on UI thread
            if (!SpeechRecognizer.isRecognitionAvailable(reactCtx)) {
                sendEvent("speechError", "Speech recognition not available")
                return@post
            }

            if (recognizer == null) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(reactCtx)
                recognizer?.setRecognitionListener(this)
            }

            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN") // change if needed
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }

            recognizer?.startListening(intent)
            sendEvent("speechState", "listening")
        }
    }

    @ReactMethod
    fun stopListening() {
        mainHandler.post {                      // <<< FIX for UI thread
            recognizer?.stopListening()
            sendEvent("speechState", "stopped")
        }
    }

    private fun sendEvent(name: String, value: String) {
        reactCtx
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(name, value)
    }

    // ------- RecognitionListener Callbacks -------

    override fun onReadyForSpeech(params: Bundle?) {
        sendEvent("speechState", "ready")
    }

    override fun onBeginningOfSpeech() {}

    override fun onRmsChanged(rmsdB: Float) {}

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {}

    override fun onError(error: Int) {
        sendEvent("speechError", "Error code: $error")
    }

    override fun onResults(results: Bundle) {
        val text = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
        sendEvent("speechResult", text)
    }

    override fun onPartialResults(partialResults: Bundle) {
        val text = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
        if (text.isNotEmpty()) sendEvent("speechPartial", text)
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}
}
