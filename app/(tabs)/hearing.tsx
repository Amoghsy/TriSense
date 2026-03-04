import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Clipboard,
  NativeEventEmitter,
  NativeModules,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";

const { SpeechModule, TTSModule } = NativeModules;
const STTEvents = new NativeEventEmitter(SpeechModule);

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Keywords that get highlighted in the transcript
const HIGHLIGHT_WORDS = [
  "urgent", "important", "help", "emergency", "danger", "warning",
  "deadline", "meeting", "today", "tomorrow", "now", "call", "fire", "alarm",
];

// Sound alerts that the app can simulate/detect notifications for
const SOUND_ALERTS = [
  { icon: "🔔", label: "Doorbell" },
  { icon: "🔥", label: "Fire Alarm" },
  { icon: "👶", label: "Baby Crying" },
  { icon: "🐕", label: "Dog Barking" },
  { icon: "📱", label: "Phone Ringing" },
  { icon: "⏰", label: "Timer Alarm" },
];

const LANGUAGES = [
  { code: "Hindi", label: "हिन्दी" },
  { code: "Kannada", label: "ಕನ್ನಡ" },
  { code: "Tamil", label: "தமிழ்" },
  { code: "Telugu", label: "తెలుగు" },
  { code: "Marathi", label: "मराठी" },
  { code: "Spanish", label: "Español" },
  { code: "French", label: "Français" },
  { code: "German", label: "Deutsch" },
  { code: "Japanese", label: "日本語" },
  { code: "Arabic", label: "العربية" },
];

type Tab = "caption" | "conversation" | "alerts";

async function geminiTranslate(text: string, targetLang: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `Translate this text to ${targetLang}. Return ONLY the translated text, nothing else:\n\n${text}` }],
          }],
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? text;
  } catch {
    return text;
  }
}

function highlightLine(line: string): React.ReactNode {
  const words = line.split(" ");
  return words.map((word, i) => {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    const isHighlighted = HIGHLIGHT_WORDS.includes(clean);
    return (
      <Text key={i} style={isHighlighted ? styles.highlighted : styles.normalWord}>
        {word}{" "}
      </Text>
    );
  });
}

export default function HearingScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("caption");

  // ── Live Captioning ────────────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [transcript, setTranscript] = useState<string[]>([]);

  // ── Translation ────────────────────────────────────────────────────────────
  const [translateOn, setTranslateOn] = useState(false);
  const [targetLang, setTargetLang] = useState("Hindi");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [translations, setTranslations] = useState<string[]>([]);
  const [translating, setTranslating] = useState(false);

  // ── Conversation Mode ──────────────────────────────────────────────────────
  const [convLines, setConvLines] = useState<{ role: "heard" | "typed"; text: string }[]>([]);
  const [replyText, setReplyText] = useState("");

  // ── Vibration alert ────────────────────────────────────────────────────────
  const [vibrationOn, setVibrationOn] = useState(true);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  const subs = useRef<any[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // ── STT listeners ──────────────────────────────────────────────────────────
  const attachListeners = () => {
    subs.current.push(
      STTEvents.addListener("speechResult", async (txt: string) => {
        setPartial("");
        const line = txt.trim();
        if (!line) return;

        setTranscript(prev => [...prev, line]);

        // Conversation Mode — add as "heard"
        if (activeTab === "conversation") {
          setConvLines(prev => [...prev, { role: "heard", text: line }]);
        }

        // Vibrate on important keyword
        if (vibrationOn && HIGHLIGHT_WORDS.some(kw => line.toLowerCase().includes(kw))) {
          Vibration.vibrate([200, 100, 200]);
        }

        // Translation
        if (translateOn) {
          setTranslating(true);
          const translated = await geminiTranslate(line, targetLang);
          setTranslations(prev => [...prev, translated]);
          setTranslating(false);
        } else {
          setTranslations(prev => [...prev, ""]);
        }

        scrollRef.current?.scrollToEnd({ animated: true });
      })
    );

    subs.current.push(
      STTEvents.addListener("speechPartial", (txt: string) => setPartial(txt))
    );

    subs.current.push(
      STTEvents.addListener("speechError", (msg: string) => {
        const code = msg?.match(/\d+/)?.[0];
        if (code !== "7") console.warn("STT error:", msg);
        setListening(false);
        setPartial("");
      })
    );
  };

  const removeListeners = () => {
    subs.current.forEach(s => s.remove());
    subs.current = [];
  };

  const startListening = () => {
    try {
      SpeechModule.startListening();
      setListening(true);
      setPartial("");
      attachListeners();
    } catch (e) {
      console.log("Start err:", e);
    }
  };

  const stopListening = () => {
    SpeechModule.stopListening();
    setListening(false);
    setPartial("");
    removeListeners();
  };

  useEffect(() => () => { stopListening(); }, []);

  // ── Save / Share transcript ────────────────────────────────────────────────
  const saveTranscript = async () => {
    const fullText = transcript
      .map((line, i) => `[${i + 1}] ${line}${translations[i] ? `\n     → ${translations[i]}` : ""}`)
      .join("\n\n");

    if (!fullText) { Alert.alert("Empty", "No transcript to save."); return; }

    try {
      await Share.share({
        title: "TriSense Transcript",
        message: fullText,
      });
    } catch (e) {
      Clipboard.setString(fullText);
      Alert.alert("Copied", "Transcript copied to clipboard.");
    }
  };

  const clearTranscript = () => {
    setTranscript([]);
    setTranslations([]);
    setConvLines([]);
    setPartial("");
  };

  // ── Conversation Mode — speak reply via TTS ───────────────────────────────
  const sendReply = () => {
    if (!replyText.trim()) return;
    setConvLines(prev => [...prev, { role: "typed", text: replyText }]);
    if (TTSModule) TTSModule.speak(replyText);
    setReplyText("");
  };

  // ── Simulate a sound alert (for demo) ─────────────────────────────────────
  const triggerAlert = (label: string) => {
    setLastAlert(label);
    Vibration.vibrate([100, 50, 100, 50, 300]);
    if (TTSModule) TTSModule.speak(`${label} detected`);
    setTimeout(() => setLastAlert(null), 4000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hearing Assistance</Text>
        <Ionicons name="ear-outline" size={26} color="#48A8FF" />
      </View>

      {/* Sound alert banner */}
      {lastAlert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>⚠️  {lastAlert} detected!</Text>
        </View>
      )}

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(["caption", "conversation", "alerts"] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "caption" ? "🎙 Caption" : tab === "conversation" ? "💬 Converse" : "🔔 Alerts"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ─── TAB: LIVE CAPTIONING ─────────────────────────────────────────── */}
      {activeTab === "caption" && (
        <ScrollView contentContainerStyle={styles.tabContent} ref={scrollRef}>

          {/* Controls row */}
          <View style={styles.controlRow}>
            {/* Mic button */}
            <TouchableOpacity
              style={[styles.micBtn, listening && { backgroundColor: "#FF4A4A" }]}
              onPress={listening ? stopListening : startListening}
            >
              <Ionicons name={listening ? "stop" : "mic"} size={22} color="#fff" />
              <Text style={styles.micText}>{listening ? "Stop" : "Start"}</Text>
            </TouchableOpacity>

            {/* Translate toggle */}
            <TouchableOpacity
              style={[styles.pill, translateOn && styles.pillActive]}
              onPress={() => setTranslateOn(t => !t)}
            >
              <MaterialCommunityIcons name="translate" size={16} color={translateOn ? "#fff" : "#48A8FF"} />
              <Text style={[styles.pillText, translateOn && { color: "#fff" }]}>
                {translateOn ? `→ ${targetLang}` : "Translate"}
              </Text>
            </TouchableOpacity>

            {/* Vibration toggle */}
            <TouchableOpacity
              style={[styles.pill, vibrationOn && styles.pillActive]}
              onPress={() => setVibrationOn(v => !v)}
            >
              <Ionicons name="phone-portrait-outline" size={16} color={vibrationOn ? "#fff" : "#48A8FF"} />
              <Text style={[styles.pillText, vibrationOn && { color: "#fff" }]}>Vibe</Text>
            </TouchableOpacity>
          </View>

          {/* Language picker */}
          {translateOn && (
            <View style={styles.langRow}>
              <Text style={styles.langLabel}>Translate to:</Text>
              <TouchableOpacity style={styles.langPicker} onPress={() => setShowLangPicker(p => !p)}>
                <Text style={styles.langPickerText}>{targetLang} {showLangPicker ? "▲" : "▼"}</Text>
              </TouchableOpacity>
            </View>
          )}
          {showLangPicker && (
            <View style={styles.langGrid}>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langChip, targetLang === l.code && styles.langChipActive]}
                  onPress={() => { setTargetLang(l.code); setShowLangPicker(false); }}
                >
                  <Text style={styles.langChipText}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Live partial text */}
          {partial !== "" && (
            <View style={styles.partialBox}>
              <Text style={styles.partialText}>🟢 {partial}</Text>
            </View>
          )}
          {translating && <Text style={styles.translatingText}>Translating…</Text>}

          {/* Transcript lines */}
          <View style={styles.transcriptBox}>
            {transcript.length === 0 && (
              <Text style={styles.emptyText}>Tap Start to begin live captioning…</Text>
            )}
            {transcript.map((line, i) => (
              <View key={i} style={styles.captionLine}>
                <Text style={styles.captionText}>
                  {highlightLine(line)}
                </Text>
                {translations[i] ? (
                  <Text style={styles.translationText}>→ {translations[i]}</Text>
                ) : null}
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={saveTranscript}>
              <Ionicons name="share-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Save / Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#374151" }]} onPress={clearTranscript}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Clear</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}

      {/* ─── TAB: CONVERSATION MODE ───────────────────────────────────────── */}
      {activeTab === "conversation" && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.tabContent} ref={scrollRef}>

            <Text style={styles.sectionLabel}>
              💬 Two-way conversation — speak or type your reply
            </Text>

            {/* Mic */}
            <TouchableOpacity
              style={[styles.micBtn, listening && { backgroundColor: "#FF4A4A" }, { alignSelf: "center", flexDirection: "row", gap: 8 }]}
              onPress={listening ? stopListening : startListening}
            >
              <Ionicons name={listening ? "stop" : "mic"} size={22} color="#fff" />
              <Text style={styles.micText}>{listening ? "Tap to Stop Hearing" : "Tap to Hear"}</Text>
            </TouchableOpacity>

            {partial !== "" && (
              <Text style={styles.partialText}>🟢 {partial}</Text>
            )}

            {/* Conversation bubbles */}
            <View style={{ marginTop: 16 }}>
              {convLines.map((line, i) => (
                <View key={i} style={[styles.bubble, line.role === "typed" && styles.bubbleRight]}>
                  <Text style={styles.bubbleRole}>{line.role === "heard" ? "🎙 Heard" : "✍️ You"}</Text>
                  <Text style={styles.bubbleText}>{line.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Reply input */}
          <View style={styles.replyBar}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply…"
              placeholderTextColor="#4B5563"
              value={replyText}
              onChangeText={setReplyText}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendReply}>
              <Ionicons name="volume-high-outline" size={20} color="#fff" />
              <Text style={styles.sendBtnText}>Speak</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── TAB: SOUND ALERTS ────────────────────────────────────────────── */}
      {activeTab === "alerts" && (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Text style={styles.sectionLabel}>
            🔔 Sound Alerts — tap any to simulate detection & vibration
          </Text>

          <View style={styles.alertGrid}>
            {SOUND_ALERTS.map((alert) => (
              <TouchableOpacity
                key={alert.label}
                style={styles.alertCard}
                onPress={() => triggerAlert(alert.label)}
              >
                <Text style={styles.alertEmoji}>{alert.icon}</Text>
                <Text style={styles.alertLabel}>{alert.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ How Sound Alerts Work</Text>
            <Text style={styles.infoText}>
              In production, the app uses the device microphone + a TensorFlow Lite sound classification
              model to automatically detect these sounds and vibrate + show a banner — no tapping needed.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📳 Vibration Settings</Text>
            <View style={styles.vibRow}>
              <Text style={styles.infoText}>Vibrate on keyword</Text>
              <TouchableOpacity
                style={[styles.toggle, vibrationOn && styles.toggleOn]}
                onPress={() => setVibrationOn(v => !v)}
              >
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                  {vibrationOn ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

/* ────────────────────── STYLES ────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#06131F" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },

  alertBanner: {
    backgroundColor: "#DC2626",
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  alertBannerText: { color: "#fff", fontWeight: "700", textAlign: "center", fontSize: 15 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#0B1D2C",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#1E3A52" },
  tabText: { color: "#6B8FAF", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#48A8FF" },

  tabContent: { padding: 16, paddingBottom: 30 },
  sectionLabel: { color: "#6B8FAF", fontSize: 13, marginBottom: 14, lineHeight: 18 },

  // Controls
  controlRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  micBtn: {
    backgroundColor: "#48A8FF", paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 30, alignItems: "center",
  },
  micText: { color: "#fff", fontSize: 12, fontWeight: "600", marginTop: 2 },

  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1.5, borderColor: "#48A8FF",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  pillActive: { backgroundColor: "#48A8FF" },
  pillText: { color: "#48A8FF", fontSize: 13, fontWeight: "600" },

  // Language picker
  langRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  langLabel: { color: "#6B8FAF", fontSize: 13 },
  langPicker: {
    backgroundColor: "#0B2234", paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 10,
  },
  langPickerText: { color: "#48A8FF", fontWeight: "600" },
  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  langChip: {
    backgroundColor: "#0B2234", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: "#1F3245",
  },
  langChipActive: { backgroundColor: "#1E5F8E", borderColor: "#48A8FF" },
  langChipText: { color: "#C9DFFC", fontSize: 13 },

  // Transcript
  partialBox: { backgroundColor: "#071E2E", borderRadius: 10, padding: 8, marginBottom: 8 },
  partialText: { color: "#5CFFAB", fontWeight: "600", fontSize: 14 },
  translatingText: { color: "#6B8FAF", marginBottom: 6, fontSize: 12 },

  transcriptBox: {
    backgroundColor: "#0B1D2C", borderRadius: 14, padding: 12, minHeight: 120,
  },
  emptyText: { color: "#3B5068", textAlign: "center", marginTop: 20 },
  captionLine: { marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#0F2336", paddingBottom: 8 },
  captionText: { color: "#C9DFFC", fontSize: 14, lineHeight: 22, flexWrap: "wrap" },
  normalWord: { color: "#C9DFFC" },
  highlighted: {
    color: "#FBBF24", fontWeight: "700",
    backgroundColor: "#78350F40", borderRadius: 3,
  },
  translationText: { color: "#5CFFAB", fontSize: 13, marginTop: 4, fontStyle: "italic" },

  // Action buttons
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: "#1E5F8E", paddingVertical: 12, borderRadius: 12,
  },
  actionBtnText: { color: "#fff", fontWeight: "600" },

  // Conversation
  bubble: {
    backgroundColor: "#0B2234", borderRadius: 12, padding: 12,
    marginBottom: 10, maxWidth: "85%", alignSelf: "flex-start",
    borderTopLeftRadius: 0,
  },
  bubbleRight: {
    backgroundColor: "#1E3A52", alignSelf: "flex-end",
    borderTopLeftRadius: 12, borderTopRightRadius: 0,
  },
  bubbleRole: { color: "#6B8FAF", fontSize: 11, marginBottom: 4 },
  bubbleText: { color: "#E5F0FF", fontSize: 14 },

  replyBar: {
    flexDirection: "row", alignItems: "flex-end", padding: 12,
    borderTopWidth: 1, borderTopColor: "#0F2336", gap: 8,
  },
  replyInput: {
    flex: 1, backgroundColor: "#0B2234", color: "#E5F0FF",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    fontSize: 14, maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: "#48A8FF", paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, alignItems: "center", gap: 4,
  },
  sendBtnText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  // Sound alerts
  alertGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  alertCard: {
    width: "30%", backgroundColor: "#0B2234", borderRadius: 14,
    padding: 14, alignItems: "center",
  },
  alertEmoji: { fontSize: 32, marginBottom: 6 },
  alertLabel: { color: "#C9DFFC", fontSize: 12, textAlign: "center", fontWeight: "600" },

  infoCard: { backgroundColor: "#0B2234", borderRadius: 14, padding: 14, marginBottom: 14 },
  infoTitle: { color: "#48A8FF", fontWeight: "700", marginBottom: 6 },
  infoText: { color: "#6B8FAF", fontSize: 13, lineHeight: 18 },
  vibRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  toggle: {
    backgroundColor: "#374151", paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, minWidth: 52, alignItems: "center",
  },
  toggleOn: { backgroundColor: "#059669" },
});
