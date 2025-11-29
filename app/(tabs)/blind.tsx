import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function BlindScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}> Blind  Assistant</Text>
          <Ionicons name="person-circle-outline" size={30} color="#ffffff" />
        </View>

        {/* Read PDF */}
        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={34}
              color="#42A5F5"
            />
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Read PDF</Text>
              <Text style={styles.cardSubtitle}>Coming Soon</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Read Image */}
        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="image-outline" size={32} color="#42A5F5" />
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Read Image</Text>
              <Text style={styles.cardSubtitle}>Coming Soon</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Voice Navigation */}
        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="mic-outline" size={32} color="#42A5F5" />
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Voice Navigation</Text>
              <Text style={styles.cardSubtitle}>Start / Stop / Next</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Volume Button Control */}
        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="volume-high-outline" size={32} color="#42A5F5" />
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Volume Button Control</Text>
              <Text style={styles.cardSubtitle}>Assign shortcuts</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ffffff" />
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="settings-outline" size={32} color="#42A5F5" />
            <View style={styles.textBlock}>
              <Text style={styles.cardTitle}>Settings</Text>
              <Text style={styles.cardSubtitle}>Language & TTS Voice</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ffffff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06131F',
  },
  scrollContainer: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#0B2234',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    marginLeft: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9EB5CC',
    marginTop: 3,
  },
});