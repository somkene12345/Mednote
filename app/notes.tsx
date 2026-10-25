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
} from "react-native";
import { database } from "../firebaseConfig";
import { ref, get, remove } from "firebase/database";

export default function SearchPatientNotes() {
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
              calculatedDuration: calculateDurationHours(
                entry.TestStartTime,
                entry.TestEndTime
              ),
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
      <View style={styles.authContainer}>
        <View style={styles.authGlassCard}>
          <Text style={styles.authHeaderTitle}>🔒 Security Access Required</Text>
          <Text style={styles.authSubText}>Enter password to query patient notes database.</Text>
          <TextInput
            style={styles.textInput}
            secureTextEntry
            placeholder="Enter Passcode"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            autoComplete="off"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePasswordSubmit}>
            <Text style={styles.primaryBtnText}>Authenticate</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.textInput, { flex: 1 }]}
          placeholder="Search by patient name or hospital ID..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchPatientsData(searchQuery)}
          autoComplete="off"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => fetchPatientsData(searchQuery)}>
          <Text style={styles.searchBtnText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#38BDF8" />
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.patientCard}>
              <View style={styles.patientCardHeader}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => togglePatientDetails(item.key)}>
                  <Text style={styles.patientNameText}>{item.key}</Text>
                  <Text style={styles.recordCountText}>
                    {expandedPatient === item.key ? "Tap to collapse" : "Tap to expand patient records"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteIconButton} onPress={() => confirmDeletePatient(item.key)}>
                  <Text style={{ fontSize: 16 }}>🗑️</Text>
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
                        <View style={styles.sectionHeaderCard}>
                          <View style={styles.sectionBadgeRow}>
                            <Text style={styles.testTypeBadge}>{testType} Test</Text>
                            <Text
                              style={[
                                styles.statusBadgeText,
                                hasEnded ? styles.statusCompleted : styles.statusOngoing,
                              ]}
                            >
                              {hasEnded ? "Completed" : "Ongoing"}
                            </Text>
                          </View>

                          <Text style={styles.sectionMetaText}>Start: {formatTimestamp(section.title)}</Text>
                          <Text style={styles.sectionMetaText}>
                            Duration: {section.testDuration || 24} Hours
                          </Text>
                          {section.sleepTime && (
                            <Text style={styles.sectionMetaText}>Sleep Window: {section.sleepTime}</Text>
                          )}
                          {section.wakeTime && (
                            <Text style={styles.sectionMetaText}>Wake Window: {section.wakeTime}</Text>
                          )}
                        </View>
                      );
                    }}
                    renderItem={({ item }) => (
                      <View style={styles.noteEntryCard}>
                        <Text style={styles.noteTime}>{formatTimestamp(item.timestamp)}</Text>
                        <Text style={styles.noteText}>
                          <Text style={styles.noteLabel}>Activity: </Text>
                          {item.Activity}
                        </Text>
                        <Text style={styles.noteText}>
                          <Text style={styles.noteLabel}>Symptom: </Text>
                          {item.Symptom}
                        </Text>
                        {item.Comment && item.Comment.trim() !== "" && (
                          <Text style={styles.noteText}>
                            <Text style={styles.noteLabel}>Comment: </Text>
                            {item.Comment}
                          </Text>
                        )}
                        <TouchableOpacity
                          style={styles.deleteEntryBtn}
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

      {/* Delete Confirmation Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modalType === "patient" ? "Delete Patient Record?" : "Delete Log Entry?"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {modalType === "patient"
                ? `This will permanently remove all medical data stored for ${selectedPatientKey}.`
                : "Are you sure you want to delete this specific timestamped log entry?"}
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={() => {
                  if (modalType === "patient" && selectedPatientKey) {
                    deletePatient(selectedPatientKey);
                  } else if (modalType === "test" && selectedTestTimestamp) {
                    deleteTestEntry(selectedTestTimestamp);
                  }
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalBtnText}>Confirm Delete</Text>
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
    backgroundColor: "#0F172A",
    padding: 16,
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  authGlassCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  authHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  authSubText: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: {
    fontSize: 16,
  },
  patientCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  patientCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientNameText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  recordCountText: {
    fontSize: 12,
    color: "#38BDF8",
    marginTop: 2,
  },
  deleteIconButton: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  sectionHeaderCard: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  sectionBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  testTypeBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#38BDF8",
    textTransform: "uppercase",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOngoing: {
    color: "#34D399",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
  },
  statusCompleted: {
    color: "#F87171",
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  sectionMetaText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 2,
  },
  noteEntryCard: {
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#38BDF8",
  },
  noteTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: "#F8FAFC",
    marginBottom: 4,
  },
  noteLabel: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  deleteEntryBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deleteEntryBtnText: {
    color: "#F87171",
    fontSize: 12,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#0284C7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
