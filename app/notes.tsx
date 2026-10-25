import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { database } from "../firebaseConfig";
import { ref, get, remove } from "firebase/database";

export default function SearchPatientNotes() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#121212' : '#F4F6F9',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#E2E8F0' : '#1E293B',
    subText: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#2D2D2D' : '#E2E8F0',
    inputBg: isDark ? '#2A2A2A' : '#F8FAFC',
    primary: '#1D4ED8',
    dangerBg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const correctPassword = "hellouzoma";
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"patient" | "test" | null>(null);
  const [selectedPatientKey, setSelectedPatientKey] = useState<string | null>(null);
  const [selectedTestTimestamp, setSelectedTestTimestamp] = useState<string | null>(null);
  const [selectedTestActivity, setSelectedTestActivity] = useState<any>(null);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp.replace(" ", "T"));
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${month}/${day}/${year} ${time}`;
  };

  const calculateDurationHours = (startTimeStr: string, endTimeStr: string): number => {
    try {
      const start = new Date(startTimeStr.replace(" ", "T"));
      const end = new Date(endTimeStr.replace(" ", "T"));
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    } catch (e) {
      return 24;
    }
  };

  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setAuthenticated(true);
      setPassword("");
    } else {
      Alert.alert("Incorrect Password", "Please try again.");
    }
  };

  const fetchPatientsData = async (query = "") => {
    setLoading(true);
    try {
      const snapshot = await get(ref(database, "entries/"));
      const data = snapshot.val();
      if (!data) {
        setPatients([]);
        return;
      }

      const results = Object.keys(data).filter((patientKey) =>
        patientKey.toLowerCase().includes(query.toLowerCase())
      );

      const resultPatients = results.map((patientKey) => {
        const patientData = data[patientKey];

        const groupedEntries = Object.keys(patientData)
          .filter((key) => key !== "TestDetails" && key !== "key")
          .flatMap((timestamp) => {
            const entry = patientData[timestamp]?.["0"];
            if (!entry) return [];

            return {
              timestamp,
              ...entry,
              calculatedDuration: calculateDurationHours(entry.TestStartTime, entry.TestEndTime),
            };
          })
          .reduce((groups: any, entry) => {
            const startTime = entry.TestStartTime;
            if (!groups[startTime]) {
              groups[startTime] = {
                entries: [],
                testDuration: entry.calculatedDuration || 24,
                sleepTime: null,
                wakeTime: null,
              };
            }

            groups[startTime].entries.push(entry);

            if (entry.SleepTime && entry.SleepTime.trim()) {
              groups[startTime].sleepTime = entry.SleepTime;
            }
            if (entry.WakeTime && entry.WakeTime.trim()) {
              groups[startTime].wakeTime = entry.WakeTime;
            }

            return groups;
          }, {});

        const sections = Object.keys(groupedEntries).map((startTime) => ({
          title: startTime,
          data: groupedEntries[startTime].entries,
          testDuration: groupedEntries[startTime].testDuration,
          sleepTime: groupedEntries[startTime].sleepTime,
          wakeTime: groupedEntries[startTime].wakeTime,
        }));

        return {
          key: patientKey,
          sections,
        };
      });

      resultPatients.sort((a, b) => {
        const aLastTest = new Date(a.sections[0]?.title.replace(" ", "T") || 0).getTime();
        const bLastTest = new Date(b.sections[0]?.title.replace(" ", "T") || 0).getTime();
        return bLastTest - aLastTest;
      });

      setPatients(resultPatients);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchPatientsData();
    }
  }, [authenticated]);

  const togglePatientDetails = (patientKey: string) => {
    setExpandedPatient((prev) => (prev === patientKey ? null : patientKey));
  };

  const confirmDeletePatient = (patientKey: string) => {
    setSelectedPatientKey(patientKey);
    setModalType("patient");
    setModalVisible(true);
  };

  const deletePatient = async (patientKey: string) => {
    try {
      await remove(ref(database, `entries/${patientKey}`));
      Alert.alert("Success", "Patient deleted successfully.");
      setPatients((prev) => prev.filter((p) => p.key !== patientKey));
    } catch (error) {
      Alert.alert("Error", "Failed to delete patient.");
    }
  };

  const confirmDeleteTestEntry = (timestamp: string, testEntry: any) => {
    setSelectedTestTimestamp(timestamp);
    setSelectedTestActivity(testEntry);
    setModalType("test");
    setModalVisible(true);
  };

  const deleteTestEntry = async (timestamp: string) => {
    if (!expandedPatient) return;

    try {
      await remove(ref(database, `entries/${expandedPatient}/${timestamp}`));
      Alert.alert("Success", "Test entry deleted successfully.");
      setPatients((prevPatients) =>
        prevPatients
          .map((patient) =>
            patient.key === expandedPatient
              ? {
                  ...patient,
                  sections: patient.sections
                    .map((section) => ({
                      ...section,
                      data: section.data.filter((entry: any) => entry.timestamp !== timestamp),
                    }))
                    .filter((section) => section.data.length > 0),
                }
              : patient
          )
          .filter((patient) => patient.sections.length > 0)
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete test entry.");
    }
  };

  if (!authenticated) {
    return (
      <View style={[styles.authContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.authCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.authTitle, { color: theme.text }]}>Security Verification</Text>
          <Text style={[styles.authSub, { color: theme.subText }]}>Enter passcode to view patient records.</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 16 }]}
            secureTextEntry
            placeholder="Enter passcode"
            placeholderTextColor={theme.subText}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={handlePasswordSubmit}
          >
            <Text style={styles.primaryBtnText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.textInput, { flex: 1, backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
          placeholder="Search patient or hospital ID..."
          placeholderTextColor={theme.subText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchPatientsData(searchQuery)}
        />
        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: theme.primary }]}
          onPress={() => fetchPatientsData(searchQuery)}
        >
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={[styles.patientCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.patientCardHeader}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => togglePatientDetails(item.key)}>
                  <Text style={[styles.patientNameText, { color: theme.text }]}>{item.key}</Text>
                  <Text style={[styles.recordCountText, { color: theme.subText }]}>
                    {expandedPatient === item.key ? "Tap to collapse" : "Tap to expand logs"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteIconButton, { backgroundColor: theme.dangerBg }]}
                  onPress={() => confirmDeletePatient(item.key)}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {expandedPatient === item.key && (
                <View style={{ marginTop: 12 }}>
                  <SectionList
                    sections={item.sections}
                    keyExtractor={(item, index) => item.timestamp + index}
                    renderSectionHeader={({ section }) => {
                      const startTime = new Date(section.title.replace(" ", "T"));
                      const endTime = new Date(
                        startTime.getTime() + (section.testDuration || 24) * 60 * 60 * 1000
                      );
                      const hasEnded = new Date() > endTime;
                      const testType = section.data?.[0]?.TestType || "Holter";

                      return (
                        <View style={[styles.sectionHeaderCard, { backgroundColor: isDark ? '#242424' : '#F8FAFC', borderColor: theme.border }]}>
                          <View style={styles.sectionBadgeRow}>
                            <Text style={[styles.testTypeBadge, { color: theme.primary }]}>{testType} Test</Text>
                            <Text
                              style={[
                                styles.statusBadgeText,
                                hasEnded ? styles.statusCompleted : styles.statusOngoing,
                              ]}
                            >
                              {hasEnded ? "Completed" : "Ongoing"}
                            </Text>
                          </View>

                          <Text style={[styles.sectionMetaText, { color: theme.subText }]}>Start: {formatTimestamp(section.title)}</Text>
                          <Text style={[styles.sectionMetaText, { color: theme.subText }]}>Duration: {section.testDuration || 24} Hours</Text>
                          {section.sleepTime && <Text style={[styles.sectionMetaText, { color: theme.subText }]}>Sleep: {section.sleepTime}</Text>}
                          {section.wakeTime && <Text style={[styles.sectionMetaText, { color: theme.subText }]}>Wake: {section.wakeTime}</Text>}
                        </View>
                      );
                    }}
                    renderItem={({ item }) => (
                      <View style={[styles.noteEntryCard, { backgroundColor: isDark ? '#2A2A2A' : '#FFFFFF', borderLeftColor: theme.primary }]}>
                        <Text style={[styles.noteTime, { color: theme.subText }]}>{formatTimestamp(item.timestamp)}</Text>
                        <Text style={[styles.noteText, { color: theme.text }]}>
                          <Text style={{ fontWeight: "600" }}>Activity: </Text>
                          {item.Activity}
                        </Text>
                        <Text style={[styles.noteText, { color: theme.text }]}>
                          <Text style={{ fontWeight: "600" }}>Symptom: </Text>
                          {item.Symptom}
                        </Text>
                        {item.Comment && item.Comment.trim() !== "" && (
                          <Text style={[styles.noteText, { color: theme.text }]}>
                            <Text style={{ fontWeight: "600" }}>Comment: </Text>
                            {item.Comment}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={[styles.deleteEntryBtn, { backgroundColor: theme.dangerBg }]}
                          onPress={() => confirmDeleteTestEntry(item.timestamp, item)}
                        >
                          <Text style={styles.deleteEntryBtnText}>Delete Log</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  />
                </View>
              )}
            </View>
          )}
        />
      )}

      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {modalType === "patient" ? "Delete Patient Record?" : "Delete Log Entry?"}
            </Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>
              {modalType === "patient"
                ? `This will permanently remove records for ${selectedPatientKey}.`
                : "Are you sure you want to delete this specific log entry?"}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? '#333' : '#E2E8F0', marginRight: 8 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#EF4444", marginLeft: 8 }]}
                onPress={() => {
                  if (modalType === "patient" && selectedPatientKey) {
                    deletePatient(selectedPatientKey);
                  } else if (modalType === "test" && selectedTestTimestamp) {
                    deleteTestEntry(selectedTestTimestamp);
                  }
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  authCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  authTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  authSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  searchBtn: {
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  patientCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  patientCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: "700",
  },
  recordCountText: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 10,
  },
  sectionHeaderCard: {
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  sectionBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  testTypeBadge: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOngoing: {
    color: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusCompleted: {
    color: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  sectionMetaText: {
    fontSize: 13,
    marginTop: 2,
  },
  noteEntryCard: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 8,
    borderLeftWidth: 3,
  },
  noteTime: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    marginBottom: 4,
  },
  deleteEntryBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteEntryBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
