package com.anonymous.TriSense

import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions

class ObjectDetectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "ObjectDetectionModule"
    }

    @ReactMethod
    fun detectObjects(imageUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(imageUri)

            val inputStream = reactContext.contentResolver.openInputStream(uri)
                ?: throw Exception("Cannot open image stream")

            val bitmap = BitmapFactory.decodeStream(inputStream)
                ?: throw Exception("Bitmap decode failed")

            // Capture actual image dimensions so JS can compute accurate spatial positions
            val imageWidth  = bitmap.width
            val imageHeight = bitmap.height

            val image = InputImage.fromBitmap(bitmap, 0)

            val options = ObjectDetectorOptions.Builder()
                .setDetectorMode(ObjectDetectorOptions.SINGLE_IMAGE_MODE)
                .enableMultipleObjects()
                .enableClassification()
                .build()

            val objectDetector = ObjectDetection.getClient(options)

            objectDetector.process(image)
                .addOnSuccessListener { detectedObjects ->
                    val results = Arguments.createArray()

                    for (obj in detectedObjects) {
                        val item = Arguments.createMap()

                        // Label & confidence
                        if (obj.labels.isNotEmpty()) {
                            item.putString("label", obj.labels[0].text)
                            item.putDouble("confidence", obj.labels[0].confidence.toDouble())
                        } else {
                            item.putString("label", "Unknown object")
                            item.putDouble("confidence", 0.0)
                        }

                        // Bounding box (pixel coordinates)
                        val box = obj.boundingBox
                        item.putInt("left",   box.left)
                        item.putInt("top",    box.top)
                        item.putInt("right",  box.right)
                        item.putInt("bottom", box.bottom)

                        // Image dimensions so JS can compute proportional position
                        item.putInt("imageWidth",  imageWidth)
                        item.putInt("imageHeight", imageHeight)

                        results.pushMap(item)
                    }

                    promise.resolve(results)
                }
                .addOnFailureListener { e ->
                    promise.reject("DETECTION_ERROR", e)
                }

        } catch (e: Exception) {
            promise.reject("DETECTION_EXCEPTION", e)
        }
    }
}
