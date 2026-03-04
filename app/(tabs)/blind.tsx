import { Camera, CameraView } from "expo-camera";
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  NativeEventEmitter,
  NativeModules,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

const { TextRecognition, TTSModule, SpeechModule, AppLauncher, ObjectDetectionModule } = NativeModules;

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// ⚠️ Set your emergency contact number here
const EMERGENCY_CONTACT = "9999999999";

const speechEmitter = new NativeEventEmitter(SpeechModule);

type CameraMode = "ocr" | "obstacle" | "describe" | "walking" | "color" | "product" | null;

export default function BlindScreen() {
  const cameraRef = useRef<CameraView | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");

  const obstacleInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const walkingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Permissions ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // ─── Voice command listener — ONLY active when this tab is focused ────────
  useFocusEffect(
    useCallback(() => {
      const resultListener = speechEmitter.addListener("speechResult", (text: string) => {
        handleCommand(text);
      });
      return () => resultListener.remove(); // detach when tab loses focus
    }, [])
  );

  // ─── Cleanup intervals on unmount ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (obstacleInterval.current) clearInterval(obstacleInterval.current);
      if (walkingInterval.current) clearInterval(walkingInterval.current);
    };
  }, []);

  const openApp = (packageName: string) => {
    try {
      AppLauncher.openApp(packageName);
      TTSModule.speak("Opening application");
    } catch (e) {
      TTSModule.speak("Application not found");
    }
  };

  // ─── Gemini Vision helper ─────────────────────────────────────────────────
  const callGeminiVision = async (base64: string, prompt: string): Promise<string> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/jpeg", data: base64 } },
            ],
          }],
        }),
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I could not process this image.";
  };

  const takePhoto = async (quality = 0.5) => {
    if (!cameraRef.current) return null;
    return cameraRef.current.takePictureAsync({ quality, base64: true });
  };

  // ─── 1. OCR ───────────────────────────────────────────────────────────────
  const readText = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1, skipProcessing: true });
      const detectedText = await TextRecognition.recognize(photo.uri);
      TTSModule.speak(detectedText?.length > 0 ? detectedText : "No text detected");
    } catch {
      TTSModule.speak("Error reading text");
    }
  };

  // ─── 2. Describe Surroundings (Gemini Vision) ─────────────────────────────
  const describeScene = async () => {
    TTSModule.speak("Capturing scene, please wait.");
    try {
      const photo = await takePhoto(0.5);
      if (!photo?.base64) return;
      const desc = await callGeminiVision(
        photo.base64,
        "Describe this scene in 1-2 sentences for a blind person. Be specific about people, objects, and their relative positions."
      );
      TTSModule.speak(desc);
    } catch {
      TTSModule.speak("Error describing surroundings");
    }
  };

  // ─── 3. Color Detection (Gemini Vision) ───────────────────────────────────
  const detectColor = async () => {
    TTSModule.speak("Detecting color, please wait.");
    try {
      const photo = await takePhoto(0.5);
      if (!photo?.base64) return;
      const result = await callGeminiVision(
        photo.base64,
        "What is the dominant color of the main object in this image? Give a short answer like 'The object is dark blue' or 'The clothing is red with white stripes.'"
      );
      TTSModule.speak(result);
    } catch {
      TTSModule.speak("Error detecting color");
    }
  };

  // ─── 4. Product / Medicine Identification (Gemini Vision) ─────────────────
  const identifyProduct = async () => {
    TTSModule.speak("Scanning product, please wait.");
    try {
      const photo = await takePhoto(0.5);
      if (!photo?.base64) return;
      const result = await callGeminiVision(
        photo.base64,
        "Identify this product or medicine. State the name, type, and any important usage or dosage instructions visible. Keep it brief and clear for a blind person."
      );
      TTSModule.speak(result);
    } catch {
      TTSModule.speak("Error identifying product");
    }
  };

  // ─── 5. Obstacle Detection (ML Kit) ──────────────────────────────────────
  const detectObstacles = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      const objects = await ObjectDetectionModule.detectObjects(photo.uri);
      if (objects?.length > 0) {
        const labels = objects
          .map((obj: any) => obj.label)
          .filter((l: string) => l !== "Unknown object");
        if (labels.length > 0) {
          TTSModule.speak([...new Set(labels)].join(", ") + " ahead");
        }
      }
    } catch (e) {
      console.log("Obstacle detection error:", e);
    }
  };

  const startObstacleDetection = () => {
    setCameraOpen(true);
    setCameraMode("obstacle");
    TTSModule.speak("Obstacle detection started. I will alert you about objects ahead.");
    obstacleInterval.current = setInterval(detectObstacles, 3000);
  };

  const stopObstacleDetection = () => {
    if (obstacleInterval.current) { clearInterval(obstacleInterval.current); obstacleInterval.current = null; }
    setCameraMode(null);
    setCameraOpen(false);
    TTSModule.speak("Obstacle detection stopped");
  };

  // ─── 6. Smart Walking Mode (ML Kit + spatial) ─────────────────────────────
  const detectForWalking = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      const objects = await ObjectDetectionModule.detectObjects(photo.uri);
      if (!objects?.length) return;
      const announcements: string[] = [];
      for (const obj of objects) {
        if (obj.label === "Unknown object") continue;
        const centerX = (obj.left + obj.right) / 2;
        const objWidth = obj.right - obj.left;
        const imgWidth = obj.imageWidth ?? 1000;
        let position: string;
        if (centerX < imgWidth * 0.33) position = "on your left";
        else if (centerX > imgWidth * 0.66) position = "on your right";
        else position = "ahead";
        const proximity = objWidth > imgWidth * 0.4 ? "Close " : "";
        announcements.push(`${proximity}${obj.label} ${position}`);
      }
      if (announcements.length > 0) TTSModule.speak(announcements.join(". "));
    } catch (e) {
      console.log("Smart walking error:", e);
    }
  };

  const startSmartWalking = () => {
    setCameraOpen(true);
    setCameraMode("walking");
    TTSModule.speak("Smart walking mode started. I will guide you about objects around you.");
    walkingInterval.current = setInterval(detectForWalking, 2500);
  };

  const stopSmartWalking = () => {
    if (walkingInterval.current) { clearInterval(walkingInterval.current); walkingInterval.current = null; }
    setCameraMode(null);
    setCameraOpen(false);
    TTSModule.speak("Smart walking mode stopped");
  };

  // ─── Shared location helper ──────────────────────────────────────────────
  // Tries cached location first (works even when GPS is warming up),
  // then falls back to a live fix.
  const getLocation = async (): Promise<Location.LocationObject | null> => {
    try {
      // 1️⃣ Try cached last-known position first (instant, no GPS needed)
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
      if (last) return last;
    } catch (_) { }

    // 2️⃣ Fall back to a live fix with a reasonable timeout
    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
      timeInterval: 10000,
    });
  };

  // ─── 7. Emergency Assistance ──────────────────────────────────────────────
  const callEmergency = async () => {
    TTSModule.speak("Calling emergency contact and sending your location.");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        try {
          const loc = await getLocation();
          if (loc) {
            const { latitude, longitude } = loc.coords;
            const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
            const smsBody = encodeURIComponent(`Emergency! I need help. My location: ${mapsLink}`);
            Linking.openURL(`sms:${EMERGENCY_CONTACT}?body=${smsBody}`);
          }
        } catch (locErr: any) {
          console.warn("Emergency location failed:", locErr?.code);
          // Still proceed to call even without location
        }
      }
      // Always dial — slight delay so SMS opens first
      setTimeout(() => Linking.openURL(`tel:${EMERGENCY_CONTACT}`), 1500);
    } catch (e: any) {
      console.error("Emergency error:", JSON.stringify(e));
      TTSModule.speak("Calling emergency now.");
      Linking.openURL(`tel:${EMERGENCY_CONTACT}`);
    }
  };

  // ─── 8. Where Am I (GPS + Reverse Geocoding) ─────────────────────────────
  const whereAmI = async () => {
    TTSModule.speak("Finding your location, please wait.");
    setLocationStatus("Locating…");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        TTSModule.speak("Location permission was denied. Please allow location access in settings.");
        setLocationStatus("Permission denied");
        return;
      }

      const loc = await getLocation();
      if (!loc) {
        TTSModule.speak("Could not get location. Please enable GPS in settings.");
        setLocationStatus("GPS unavailable — enable in Settings");
        return;
      }

      console.log("GPS coords:", loc.coords.latitude, loc.coords.longitude);

      const results = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const place = results?.[0];
      if (place) {
        const parts = [
          place.name,
          place.street,
          place.district,
          place.subregion,
          place.city,
          place.region,
        ].filter(Boolean);
        const address = parts.join(", ");
        TTSModule.speak(`You are near ${address}`);
        setLocationStatus(address);
      } else {
        const fallback = `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
        TTSModule.speak(`Your coordinates are ${fallback}`);
        setLocationStatus(fallback);
      }
    } catch (e: any) {
      const code = e?.code ?? "";
      const msg = e?.message ?? JSON.stringify(e);
      console.error("Location error:", code, msg);

      if (code === "ERR_CURRENT_LOCATION_IS_UNAVAILABLE") {
        TTSModule.speak("GPS is unavailable. Please turn on location services in your device settings.");
        setLocationStatus("GPS is off — enable in Settings > Location");
      } else if (code === "ERR_LOCATION_UNAUTHORIZED") {
        TTSModule.speak("Location permission denied.");
        setLocationStatus("Permission denied");
      } else {
        TTSModule.speak("Error getting location. Make sure GPS is enabled.");
        setLocationStatus("Error: " + msg.slice(0, 60));
      }
    }
  };

  // ─── Voice Commands ───────────────────────────────────────────────────────

  // Gemini intent fallback — called only when no keyword matched
  const resolveIntentWithGemini = async (rawText: string) => {
    TTSModule.speak("Let me figure that out.");
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are a voice command classifier for a blind-assistance app called TriSense.
Map the user's speech to ONE of these exact command IDs:
read_text, describe, color, product, obstacle, smart_walk, emergency, location, time, date, open_camera, open_youtube, open_whatsapp, open_chrome, stop, hello, unknown

User said: "${rawText}"

Reply with ONLY the command ID, nothing else.`,
              }],
            }],
          }),
        }
      );
      const data = await res.json();
      const intent = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() ?? "unknown";
      console.log("Gemini intent:", intent);
      executeIntent(intent);
    } catch {
      TTSModule.speak("Sorry, I did not understand that command.");
    }
  };

  const executeIntent = (intent: string) => {
    switch (intent) {
      case "read_text":
        setCameraOpen(true); setCameraMode("ocr");
        TTSModule.speak("Opening text reader"); break;
      case "describe":
        setCameraOpen(true); setCameraMode("describe");
        TTSModule.speak("Opening camera to describe surroundings"); break;
      case "color":
        setCameraOpen(true); setCameraMode("color");
        TTSModule.speak("Detecting color"); break;
      case "product":
        setCameraOpen(true); setCameraMode("product");
        TTSModule.speak("Opening camera to identify product"); break;
      case "obstacle":
        startObstacleDetection(); break;
      case "smart_walk":
        startSmartWalking(); break;
      case "emergency":
        callEmergency(); break;
      case "location":
        whereAmI(); break;
      case "time": {
        const now = new Date();
        const h = now.getHours(), m = now.getMinutes();
        const ampm = h >= 12 ? "PM" : "AM";
        TTSModule.speak(`The time is ${h % 12 || 12}:${m < 10 ? "0" + m : m} ${ampm}`); break;
      }
      case "date":
        TTSModule.speak(`Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`); break;
      case "open_camera":
        setCameraOpen(true); setCameraMode("ocr");
        TTSModule.speak("Opening camera"); break;
      case "open_youtube":
        openApp("com.google.android.youtube"); break;
      case "open_whatsapp":
        openApp("com.whatsapp"); break;
      case "open_chrome":
        openApp("com.android.chrome"); break;
      case "stop":
        stopObstacleDetection(); stopSmartWalking();
        SpeechModule.stopListening();
        TTSModule.speak("Stopped"); break;
      case "hello":
        TTSModule.speak("Hello! I am TriSense. How can I help you?"); break;
      default:
        TTSModule.speak("Sorry, I did not understand that command.");
    }
  };

  const handleCommand = (command: string) => {
    const t = command.toLowerCase().trim();
    console.log("Voice command:", t);

    // helper — returns true if ANY of the phrases appear in t
    const has = (...phrases: string[]) => phrases.some(p => t.includes(p));

    if (has("read text", "read the text", "scan text", "ocr", "read sign", "read label")) { setCameraOpen(true); setCameraMode("ocr"); TTSModule.speak("Opening text reader"); }

    else if (has("describe", "what's around", "what is around", "what do you see", "look around", "tell me what you see", "surroundings", "environment")) { setCameraOpen(true); setCameraMode("describe"); TTSModule.speak("Opening camera to describe surroundings"); }

    else if (has("color", "colour", "what color", "what colour", "which color")) { setCameraOpen(true); setCameraMode("color"); TTSModule.speak("Detecting color"); }

    else if (has("identify", "scan product", "what product", "what medicine", "what is this", "what's this", "product", "medicine", "drug", "tablet", "bottle")) { setCameraOpen(true); setCameraMode("product"); TTSModule.speak("Opening camera to identify product"); }

    else if (has("emergency", "help me", "call help", "i need help", "sos", "call emergency", "send help")) { callEmergency(); }

    else if (has("where am i", "my location", "where are we", "current location", "location", "find me", "where is this")) { whereAmI(); }

    else if (has("smart walk", "walking mode", "guide me", "navigate", "walk mode", "start walking", "help me walk")) { startSmartWalking(); }

    else if (has("stop walking", "end walking", "exit walk")) { stopSmartWalking(); }

    else if (has("obstacle", "detect obstacle", "any obstacle", "what's ahead", "what is ahead", "in front")) { startObstacleDetection(); }

    else if (has("open camera", "camera", "take photo", "take picture")) { setCameraOpen(true); setCameraMode("ocr"); TTSModule.speak("Opening camera"); }

    else if (has("youtube", "open youtube")) { openApp("com.google.android.youtube"); }

    else if (has("whatsapp", "open whatsapp")) { openApp("com.whatsapp"); }

    else if (has("chrome", "open chrome", "browser")) { openApp("com.android.chrome"); }

    else if (has("what time", "current time", "tell time", "time is it", "time now")) {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      TTSModule.speak(`The time is ${h % 12 || 12}:${m < 10 ? "0" + m : m} ${h >= 12 ? "PM" : "AM"}`);
    }

    else if (has("date", "what day", "today", "what's today")) { TTSModule.speak(`Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`); }

    else if (has("go back", "go home", "home screen", "back")) {
      stopObstacleDetection(); stopSmartWalking();
      setCameraOpen(false); setCameraMode(null);
      TTSModule.speak("Going back");
    }

    else if (has("stop", "cancel", "quit", "end")) {
      stopObstacleDetection(); stopSmartWalking();
      SpeechModule.stopListening();
      TTSModule.speak("Stopped");
    }

    else if (has("hello", "hi", "hey", "hey trisense")) { TTSModule.speak("Hello! I am TriSense. How can I help you?"); }

    // ── Gemini AI fallback — handles anything not matched above ──
    else { resolveIntentWithGemini(t); }
  };

  const startVoice = () => {
    SpeechModule.startListening();
    TTSModule.speak("Listening for commands");
  };

  // ─── Camera overlays helper ───────────────────────────────────────────────
  const openCameraMode = (mode: CameraMode, speech: string) => {
    setCameraOpen(true);
    setCameraMode(mode);
    TTSModule.speak(speech);
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraMode(null);
  };

  // ─── Camera Screen ────────────────────────────────────────────────────────
  if (cameraOpen) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

        {/* OBSTACLE DETECTION */}
        {cameraMode === "obstacle" && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>🚶 Obstacle Detection Active</Text>
            <Text style={styles.overlaySub}>Scanning every 3 s…</Text>
            <TouchableOpacity style={styles.stopBtn} onPress={stopObstacleDetection}>
              <Text style={styles.stopBtnText}>Stop Detection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SMART WALKING MODE */}
        {cameraMode === "walking" && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>🧭 Smart Walking Mode</Text>
            <Text style={styles.overlaySub}>Spatial narration every 2.5 s…</Text>
            <TouchableOpacity style={[styles.stopBtn, { backgroundColor: "#7C3AED" }]} onPress={stopSmartWalking}>
              <Text style={styles.stopBtnText}>Stop Walking Mode</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* DESCRIBE SURROUNDINGS */}
        {cameraMode === "describe" && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>👁️ Describe Surroundings</Text>
            <Text style={styles.overlaySub}>Tap to describe what's around you</Text>
            <TouchableOpacity style={styles.inlineBtn} onPress={describeScene}>
              <Text style={styles.captureBtnText}>Describe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.stopBtn, { marginTop: 12 }]} onPress={closeCamera}>
              <Text style={styles.stopBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* COLOR DETECTION */}
        {cameraMode === "color" && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>🎨 Color Detection</Text>
            <Text style={styles.overlaySub}>Point camera at the object and tap</Text>
            <TouchableOpacity style={[styles.inlineBtn, { backgroundColor: "#0891B2" }]} onPress={detectColor}>
              <Text style={styles.captureBtnText}>Detect Color</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.stopBtn, { marginTop: 12 }]} onPress={closeCamera}>
              <Text style={styles.stopBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* PRODUCT / MEDICINE ID */}
        {cameraMode === "product" && (
          <View style={styles.overlay}>
            <Text style={styles.overlayTitle}>💊 Product / Medicine ID</Text>
            <Text style={styles.overlaySub}>Point camera at product label and tap</Text>
            <TouchableOpacity style={[styles.inlineBtn, { backgroundColor: "#059669" }]} onPress={identifyProduct}>
              <Text style={styles.captureBtnText}>Identify</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.stopBtn, { marginTop: 12 }]} onPress={closeCamera}>
              <Text style={styles.stopBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OCR / default */}
        {(cameraMode === "ocr" || cameraMode === null) && (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => { closeCamera(); TTSModule.speak("Going back"); }}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={readText}>
              <Text style={styles.captureBtnText}>Tap to Read</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  // ─── Main Screen ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}> Blind Assistance</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Row 1 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.card} onPress={() => { openCameraMode("ocr", "Camera opened. Tap screen to read text."); }}>
            <Text style={styles.cardEmoji}>📖</Text>
            <Text style={styles.cardLabel}>Read Text</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={startVoice}>
            <Text style={styles.cardEmoji}>🎤</Text>
            <Text style={styles.cardLabel}>Voice Command</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.card} onPress={startObstacleDetection}>
            <Text style={styles.cardEmoji}>🚶</Text>
            <Text style={styles.cardLabel}>Obstacle Detection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => { openCameraMode("describe", "Camera opened. Tap to describe surroundings."); }}>
            <Text style={styles.cardEmoji}>👁️</Text>
            <Text style={styles.cardLabel}>Describe Scene</Text>
          </TouchableOpacity>
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.card} onPress={startSmartWalking}>
            <Text style={styles.cardEmoji}>🧭</Text>
            <Text style={styles.cardLabel}>Smart Walking</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => { openCameraMode("color", "Camera opened. Point at object and tap."); }}>
            <Text style={styles.cardEmoji}>🎨</Text>
            <Text style={styles.cardLabel}>Color Detection</Text>
          </TouchableOpacity>
        </View>

        {/* Row 4 */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.card} onPress={() => { openCameraMode("product", "Camera opened. Point at product label and tap."); }}>
            <Text style={styles.cardEmoji}>💊</Text>
            <Text style={styles.cardLabel}>Product / Medicine</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={whereAmI}>
            <Text style={styles.cardEmoji}>📍</Text>
            <Text style={styles.cardLabel}>Where Am I?</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency — full width */}
        <TouchableOpacity style={styles.emergencyBtn} onPress={callEmergency}>
          <Text style={styles.emergencyEmoji}>🆘</Text>
          <Text style={styles.emergencyLabel}>Emergency Assistance</Text>
        </TouchableOpacity>

        {/* Location status */}
        {locationStatus !== "" && (
          <View style={styles.locationBox}>
            <Text style={styles.locationText}>📍 {locationStatus}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#06131F",
  },
  title: {
    fontSize: 22,
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 40,
    marginBottom: 10,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  card: {
    width: "48%",
    backgroundColor: "#0B2234",
    borderRadius: 18,
    paddingVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  emergencyBtn: {
    backgroundColor: "#7F1D1D",
    borderWidth: 1.5,
    borderColor: "#DC2626",
    borderRadius: 18,
    paddingVertical: 22,
    marginBottom: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  emergencyEmoji: {
    fontSize: 28,
  },
  emergencyLabel: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  locationBox: {
    backgroundColor: "#0B2234",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  locationText: {
    color: "#6EE7B7",
    fontSize: 14,
    textAlign: "center",
  },

  // Camera overlays
  overlay: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(6,19,31,0.92)",
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  overlayTitle: {
    color: "#4ADE80",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  overlaySub: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
  },
  // absolute-positioned button for OCR full-screen mode
  captureBtn: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#0B2234",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
  },
  // relative button used inside overlay panels
  inlineBtn: {
    backgroundColor: "#0B2234",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 4,
  },
  captureBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  stopBtn: {
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  stopBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backBtn: {
    position: "absolute",
    top: 50, left: 20,
    backgroundColor: "rgba(6,19,31,0.8)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 15,
    zIndex: 10,
  },
  backBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});