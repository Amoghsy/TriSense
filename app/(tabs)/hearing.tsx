import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  NativeEventEmitter, NativeModules, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View
} from "react-native";

const { SpeechModule } = NativeModules;
const STTEvents = new NativeEventEmitter(SpeechModule);

export default function HearingScreen() {

  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState<string[]>([]);
  const [partial, setPartial] = useState("");

  const subs = useRef<any[]>([]);

  const addFinal = (txt: string) => setFinalText(p => [...p, txt]);

  /* 🎤 START */
  const start = () => {
    try {
      SpeechModule.startListening();
      setListening(true);
      setPartial("");

      // final
      subs.current.push(
        STTEvents.addListener("onSpeechResult", (txt:string)=>{
          addFinal(txt);
          setPartial("");
        })
      );

      // live partial
      subs.current.push(
        STTEvents.addListener("onSpeechPartial", (txt:string)=>{
          setPartial(txt);
        })
      );

    } catch(e){
      console.log("Start err:",e);
    }
  };

  /* 🛑 STOP */
  const stop = () => {
    setListening(false);
    SpeechModule.stopListening();
    setPartial("");

    subs.current.forEach(s=>s.remove());
    subs.current=[];
  };

  useEffect(()=>{
    return ()=> stop(); // cleanup
  },[]);

  return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Hearing Assistance</Text>
        <Ionicons name="ear-outline" size={30} color="#fff" />
      </View>

      {/* MIC BUTTON */}
      <TouchableOpacity
        style={[styles.micBtn, listening && {backgroundColor:"#FF4A4A"}]}
        onPress={listening ? stop : start}
      >
        <Ionicons name={listening ? "stop" : "mic"} size={30} color="#fff"/>
        <Text style={styles.micText}>{listening ? "Stop Listening" : "Start Live Captioning"}</Text>
      </TouchableOpacity>

      {/* CAPTION BOX */}
      <View style={styles.captionBox}>

        {partial !== "" && (
          <Text style={styles.liveText}>🟢 {partial}</Text>
        )}

        <ScrollView>
          {finalText.map((line,i)=>(
            <Text key={i} style={styles.captionLine}>• {line}</Text>
          ))}
        </ScrollView>
      </View>

      {/* FEATURE GRID PRESERVED */}
      <ScrollView style={{marginTop:20}}>
        <View style={styles.grid}>

          <Feature icon="mic-outline" text="Live Speech → Text"/>
          <Feature icon2="translate" text="Multi‑Language Transcription"/>
          <Feature icon="document-text-outline" text="Save Notes"/>
          <Feature icon="document-outline" text="Export to PDF"/>
          <Feature icon="alert-circle-outline" text="Emergency Alerts"/>
          <Feature icon2="hand-pointing-left" text="Sign Language Avatar"/>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Feature button */
const Feature = ({icon,icon2,text}:{icon?:any,icon2?:any,text:string}) => (
  <View style={styles.box}>
    {icon && <Ionicons name={icon} size={34} color="#48A8FF"/>}
    {icon2 && <MaterialCommunityIcons name={icon2} size={34} color="#48A8FF"/>}
    <Text style={styles.boxText}>{text}</Text>
  </View>
);

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:"#06131F", padding:20 },
  header:{ flexDirection:"row", justifyContent:"space-between", marginBottom:18 },
  title:{ fontSize:22, fontWeight:"700", color:"#fff" },

  micBtn:{ backgroundColor:"#48A8FF", padding:18, borderRadius:14, alignItems:"center" },
  micText:{ color:"#fff", marginTop:5, fontWeight:"600" },

  captionBox:{ backgroundColor:"#0c1e2e", padding:14, marginTop:22,
    borderRadius:14, height:"32%" },

  liveText:{ color:"#5CFFAB", marginBottom:8, fontWeight:"700" },
  captionLine:{ color:"#C9DFFC", fontSize:14, marginVertical:2 },

  grid:{ flexDirection:"row", flexWrap:"wrap", justifyContent:"space-between", marginTop:25 },
  box:{ width:"47%", backgroundColor:"#0B2234", padding:22, borderRadius:15,
        marginBottom:18, alignItems:"center" },
  boxText:{ color:"#E6F2FF", marginTop:8, textAlign:"center", fontWeight:"600" }
});
