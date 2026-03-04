package com.anonymous.TriSense

import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class TextRecognitionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "TextRecognition"
    }

    @ReactMethod
    fun recognize(imageUri: String, promise: Promise) {

        try {

            val uri = Uri.parse(imageUri)

            val inputStream = reactContext.contentResolver.openInputStream(uri)
                ?: throw Exception("Cannot open image stream")

            val bitmap = BitmapFactory.decodeStream(inputStream)
                ?: throw Exception("Bitmap decode failed")

            val image = InputImage.fromBitmap(bitmap, 0)

            val recognizer =
                TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

            recognizer.process(image)
                .addOnSuccessListener { visionText: Text ->
                    promise.resolve(visionText.text)
                }
                .addOnFailureListener { e ->
                    promise.reject("OCR_ERROR", e)
                }

        } catch (e: Exception) {
            promise.reject("OCR_EXCEPTION", e)
        }
    }
}