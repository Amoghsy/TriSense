package com.anonymous.TriSense

import android.content.Intent
import com.facebook.react.bridge.*

class AppLauncher(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AppLauncher"
    }

    @ReactMethod
    fun openApp(packageName: String) {

        val pm = reactContext.packageManager
        val intent = pm.getLaunchIntentForPackage(packageName)

        if (intent != null) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
        }
    }
}