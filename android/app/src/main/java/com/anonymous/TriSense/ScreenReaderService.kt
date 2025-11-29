package com.anonymous.TriSense


import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.speech.tts.TextToSpeech
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.util.Locale
import kotlin.math.abs

class ScreenReaderService : AccessibilityService(), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var lastScreenHash: Int? = null
    private var initialized = false

    override fun onServiceConnected() {
        super.onServiceConnected()
        tts = TextToSpeech(this, this)

        val info = AccessibilityServiceInfo().apply {
            eventTypes = (
                    AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or
                            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                            AccessibilityEvent.TYPE_VIEW_SCROLLED or
                            AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED or
                            AccessibilityEvent.TYPE_VIEW_ACCESSIBILITY_FOCUSED or
                            AccessibilityEvent.TYPE_VIEW_FOCUSED
                    )
            feedbackType = AccessibilityServiceInfo.FEEDBACK_SPOKEN
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS
            notificationTimeout = 60
        }
        serviceInfo = info

        speak("Screen Reader Activated")
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            initialized = true
            tts?.language = Locale("en", "IN")
            tts?.setSpeechRate(0.95f)
            tts?.setPitch(1.05f)

            val highQualityVoice = tts?.voices?.firstOrNull { it.locale.language == "en" && it.quality >= 400 }
            if (highQualityVoice != null) tts?.voice = highQualityVoice
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!initialized || event == null) return
        val root = rootInActiveWindow ?: return

        // 🟢 FULL‑AUTO → Reads entire screen text after each change
        val text = grabAllText(root).trim()
        if (text.isNotEmpty()) {
            val textHash = text.hashCode()
            if (lastScreenHash == null || abs(textHash - (lastScreenHash ?: 0)) > 50) {
                lastScreenHash = textHash
                speakFlush(text)
            }
        }

        // Live typing speech
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            val typed = event.text?.joinToString(" ")?.trim()
            if (!typed.isNullOrEmpty()) speakFlush("Typing: $typed")
        }
    }

    override fun onInterrupt() { tts?.stop() }
    override fun onDestroy() { tts?.shutdown(); super.onDestroy() }

    private fun speak(msg: String) {
        tts?.speak(msg, TextToSpeech.QUEUE_ADD, null, "INIT")
    }

    private fun speakFlush(msg: String) {
        tts?.speak(msg, TextToSpeech.QUEUE_FLUSH, null, "UPDATE")
    }

    // 📄 Extract every visible text on screen recursively
    private fun grabAllText(node: AccessibilityNodeInfo): String {
        val output = StringBuilder()
        getNodeText(node, output)
        return output.toString()
    }

    private fun getNodeText(node: AccessibilityNodeInfo?, out: StringBuilder) {
        if (node == null) return

        if (node.isVisibleToUser) {
            val label = node.text ?: node.contentDescription
            if (!label.isNullOrBlank()) out.append(label.toString()).append(". ")
        }

        for (i in 0 until node.childCount) getNodeText(node.getChild(i), out)
    }
}
