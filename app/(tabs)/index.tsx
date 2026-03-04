import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---- Gemini API Key ----
const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// ---- Native Speech Module Type ----
type SpeechModuleType = {
  startListening: () => void;
  stopListening: () => void;
};

// Use "any" at runtime but keep a TS shape
const speechModule: SpeechModuleType | undefined =
  (NativeModules as any).SpeechModule;

console.log("🔧 NativeModules.SpeechModule =", speechModule);

// ---- Helper: Request microphone permission (runtime) ----
async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "TriSense needs microphone access for speech recognition.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      }
    );

    console.log("🎤 Mic permission result:", result);

    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error("❌ Mic permission error:", err);
    return false;
  }
}

// ---- Gemini Call ----
async function askGemini(prompt: string): Promise<string> {
  const systemInstruction = `
You are TriSense — a disability‑assistive AI.
When responding to deaf/hard‑of‑hearing users:
- Provide clear short sentences
- Avoid complex words unless needed
- Offer visual‑friendly explanations
- Provide actionable steps instead of long paragraphs
- Use bullet points where helpful
- If user asks about sound / music / alerts, describe them visually
`;

  const finalPrompt = `${systemInstruction}\nUser: ${prompt}`;

  try {
    console.log("🌐 Sending to Gemini:", finalPrompt.slice(0, 200) + "...");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalPrompt }] }],
        }),
      }
    );

    console.log("🌐 Gemini status:", res.status);
    const data = await res.json();
    console.log("🔍 GEMINI RESPONSE =>", JSON.stringify(data, null, 2));

    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I couldn't generate a response."
    );
  } catch (e) {
    console.warn("Gemini error", e);
    return "Problem communicating with AI.";
  }
}

export default function App() {
  const router = useRouter();

  // chat state
  const [messages, setMessages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const addMsg = (m: string) => setMessages((prev) => [...prev, m]);

  // hook Android speech events
  useEffect(() => {
    console.log("📱 Platform:", Platform.OS);
    if (Platform.OS !== "android") {
      console.warn("⚠️ Not Android – native STT disabled");
      return;
    }

    if (!speechModule) {
      console.error("❌ SpeechModule is undefined in NativeModules");
      return;
    }

    console.log("✅ Initializing NativeEventEmitter for SpeechModule");
    const emitter = new NativeEventEmitter(speechModule as any);

    const subResult = emitter.addListener(
      "speechResult",
      async (text: string) => {
        console.log("✅ speechResult event:", text);
        setIsListening(false);
        setPartial("");
        addMsg("You: " + text);

        setStatusMsg("Thinking…");
        const reply = await askGemini(text);
        addMsg("AI: " + reply);
        setStatusMsg(null);
      }
    );

    const subPartial = emitter.addListener(
      "speechPartial",
      (text: string) => {
        console.log("🟡 speechPartial event:", text);
        setPartial(text);
      }
    );

    const subState = emitter.addListener("speechState", (s: string) => {
      console.log("ℹ️ speechState event:", s);
      setStatusMsg(s);
    });

    const subError = emitter.addListener("speechError", (msg: string) => {
      console.warn("⚠️ speechError event:", msg);
      setIsListening(false);

      // Map Android speech error codes to friendly messages
      const friendlyMsg = msg.includes("7")
        ? "No speech detected. Please try again."
        : msg.includes("6")
          ? "No speech input. Please try again."
          : msg.includes("5")
            ? "Mic error. Check permission."
            : msg.includes("2")
              ? "Network error. Check connection."
              : "Speech error. Please try again.";

      setStatusMsg(friendlyMsg);
    });

    return () => {
      console.log("🧹 Cleaning up SpeechModule listeners");
      subResult.remove();
      subPartial.remove();
      subState.remove();
      subError.remove();
    };
  }, []);

  const handleStartListening = async () => {
    console.log("🎤 Mic button pressed");

    if (Platform.OS !== "android") {
      alert("Android STT only works on Android.");
      return;
    }

    if (!speechModule) {
      console.error("❌ SpeechModule is null/undefined on start");
      alert("Speech module not available. Check native linking/package name.");
      return;
    }

    // Runtime permission
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      console.warn("🚫 Mic permission denied by user");
      setStatusMsg("Mic permission denied");
      return;
    }

    try {
      console.log("▶️ Calling SpeechModule.startListening()");
      speechModule.startListening();
      setIsListening(true);
      setStatusMsg("Listening…");
    } catch (e) {
      console.error("❌ startListening error:", e);
      setIsListening(false);
      setStatusMsg("Mic error");
    }
  };

  const handleStopListening = () => {
    console.log("⏹ Stop button pressed");

    if (Platform.OS !== "android") return;
    if (!speechModule) {
      console.error("❌ SpeechModule is null/undefined on stop");
      return;
    }

    try {
      console.log("⏹ Calling SpeechModule.stopListening()");
      speechModule.stopListening();
      setIsListening(false);
      setStatusMsg("Stopped");
    } catch (e) {
      console.error("❌ stopListening error:", e);
    }
  };

  // ---------- HOME / CHAT SCREEN ----------
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#04070F" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="eye-outline" size={22} color="#ffffff" />
          <Text style={styles.appName}>  TriSense</Text>
        </View>
        
      </View>

      {/* AI Audio Chatbot */}
      <View style={styles.chatbotBox}>
        <MaterialCommunityIcons
          name="robot-outline"
          size={42}
          color="#FFFFFF"
          style={{ marginBottom: 10 }}
        />
        <Text style={styles.chatbotTitle}>AI Audio Chatbot</Text>
        <Text style={styles.desc}>
          {isListening
            ? "Listening… speak now"
            : "Tap the microphone and speak"}
        </Text>

        <TouchableOpacity
          style={[
            styles.micButton,
            isListening && { backgroundColor: "#B71C1C" },
          ]}
          onPress={isListening ? handleStopListening : handleStartListening}
        >
          <Ionicons
            name={isListening ? "stop" : "mic"}
            size={32}
            color="#ffffff"
          />
        </TouchableOpacity>

        {partial ? (
          <Text style={{ color: "#9ca3af", marginTop: 10 }}>🗣 {partial}</Text>
        ) : null}

        {statusMsg ? (
          <Text style={{ color: "#6ee7b7", marginTop: 4 }}>{statusMsg}</Text>
        ) : null}
      </View>

      {/* Chat Log */}
      <Text style={styles.sectionText}>Chat Log</Text>
      <ScrollView
        style={{
          backgroundColor: "#0B1220",
          borderRadius: 12,
          padding: 12,
          height: "35%",
        }}
      >
        {messages.map((m, i) => (
          <Text key={i} style={{ color: "white", marginBottom: 6 }}>
            {m}
          </Text>
        ))}
      </ScrollView>

      {/* Assistance tools placeholders */}
      <Text style={styles.sectionText}>Assistance Tools</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/blind")}>
        <View style={styles.row}>
          <Ionicons name="eye-outline" size={26} color="white" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.cardTitle}>Blind Assistance</Text>
            <Text style={styles.smallText}>Describe images, read documents</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/hearing")}>
        <View style={styles.row}>
          <Ionicons name="ear-outline" size={26} color="white" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.cardTitle}>Hearing Assistance</Text>
            <Text style={styles.smallText}>Live transcription, sound alerts</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push("/(tabs)/cognitive")}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="brain" size={26} color="white" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.cardTitle}>Cognitive Assistance</Text>
            <Text style={styles.smallText}>
              Task reminders, simplified guides
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ---------------- STYLES (your original, reused) ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#04070F", paddingHorizontal: 18 },
  header: {
    marginTop: 35,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  appName: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginLeft: 8 },
  chatbotBox: {
    backgroundColor: "#0B1220",
    marginTop: 30,
    paddingVertical: 28,
    borderRadius: 18,
    alignItems: "center",
  },
  chatbotTitle: { fontSize: 20, color: "#fff", fontWeight: "700" },
  desc: { color: "#b3b9c9", marginTop: 5, fontSize: 14 },
  micButton: {
    marginTop: 15,
    backgroundColor: "#3872F3",
    padding: 16,
    borderRadius: 40,
  },
  sectionText: {
    color: "#A7B2D9",
    fontSize: 16,
    marginTop: 25,
    marginBottom: 10,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#0B1220",
    padding: 20,
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center" },
  cardTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  smallText: { color: "#97A3C1", fontSize: 13, marginTop: 3 },
});
