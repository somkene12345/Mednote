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
  Modal,
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const correctPassword = "hellouzoma";

  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setAuthenticated(true);
      setPassword("");
    } else {
      alert("Incorrect Password");
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(database, "entries/"));
      const data = snapshot.val();
      if (!data) {
        setPatients([]);
        return;
      }

      const results = Object.keys(data).filter((patientKey) =>
        patientKey.toLowerCase().includes(searchQuery.toLowerCase())
      );

      const resultPatients = results.map((patientKey) => {
        const patientData = data[patientKey];
        const testDetails = patientData.TestDetails || {};

        const groupedEntries = Object.keys(patientData)
          .filter((key) => key !== "TestDetails" && key !== "key")
          .map((timestamp) => ({
            timestamp,
            ...patientData[timestamp]["0"],
          }))
          .reduce((groups, entry) => {
            const startTime = entry.TestStartTime;
            if (!groups[startTime]) {
              groups[startTime] = [];
            }
            groups[startTime].push(entry);
            return groups;
          }, {});

        const sections = Object.keys(groupedEntries).map((startTime) => ({
          title: startTime,
          data: groupedEntries[startTime],
        }));

        return {
          key: patientKey,
          testDetails,
          sections,
        };
      });

      setPatients(resultPatients);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string) => {
    setSearchQuery(text);
  };

  const togglePatientDetails = (patientKey: string) => {
    setExpandedPatient((prev) => (prev === patientKey ? null : patientKey));
  };

  const confirmDeletePatient = (patientKey: string) => {
    setPatientToDelete(patientKey);
    setDeleteModalVisible(true);
  };

  const deletePatient = async () => {
    if (!patientToDelete) return;
    try {
      await remove(ref(database, `entries/${patientToDelete}`));
      setPatients((prev) => prev.filter((p) => p.key !== patientToDelete));
    } catch (error) {
      console.error("Error deleting patient:", error);
    } finally {
      setDeleteModalVisible(false);
      setPatientToDelete(null);
    }
  };

  const refreshData = () => {
    handleSearch();
  };

  useEffect(() => {
    handleSearch();
  }, []);

  if (!authenticated) {
    return (
      <View style={styles.authContainer}>
        <Text style={styles.authText}>Enter Password to Access Notes</Text>
        <TextInput
          style={styles.authInput}
          secureTextEntry
          placeholder="Enter Password"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.authButton} onPress={handlePasswordSubmit}>
          <Text style={styles.authButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search by patient name or hospital no"
          value={searchQuery}
          onChangeText={handleChange}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.patientContainer}>
              <View style={styles.patientHeader}>
                <TouchableOpacity onPress={() => togglePatientDetails(item.key)}>
                  <Text style={styles.patientName}>{item.key}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDeletePatient(item.key)}>
                  <Text style={styles.deleteButton}>🗑</Text>
                </TouchableOpacity>
              </View>
              {expandedPatient === item.key && (
                <View>
                  <SectionList
                    sections={item.sections.reverse()}
                    keyExtractor={(entry, index) => entry.timestamp + index}
                    renderItem={({ item }) => (
<View style={styles.noteContainer}>
<Text style={styles.noteDate}>
  {new Date(new Date(item.timestamp.replace(" ", "T")).getTime() + 3600000)
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false, // Keeps it in 24-hour format
    })
    .replace(",", "")}
</Text>

                        <Text style={styles.note}>Activity: {item.Activity}</Text>
                        <Text style={styles.note}>Symptom: {item.Symptom}</Text>
                        {item.Comment && item.Comment.trim() !== "" && (
                          <Text style={styles.note}>Comments: {item.Comment}</Text>
                        )}
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
      <Modal visible={deleteModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>Are you sure you want to delete this patient?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setDeleteModalVisible(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmDeleteButton]} onPress={deletePatient}>
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    color: "red",
    fontSize: 20,
  },
  refreshButton: {
    backgroundColor: "blue",
    padding: 10,
    borderRadius: 6,
    marginLeft: 10,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    padding: 20,
    backgroundColor: "white",
    borderRadius: 6,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    padding: 10,
  },
  confirmDeleteButton: {
    backgroundColor: "red",
  },
  modalButtonText: {
    color: "white",
  },
testDetailsContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  testDetail: {
    fontSize: 16,
    marginBottom: 5,
  },
  sectionHeader: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginTop: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f8f8",
  },
  authText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  authInput: {
    height: 40,
    width: "80%",
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 16,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  authButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 6,
    width: "60%",
    alignItems: "center",
  },
  authButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f8f8",
  },
  input: {
    height: 40,
    borderColor: "gray",
    borderWidth: 1,
    marginBottom: 20,
    paddingLeft: 10,
    fontSize: 16,
    borderRadius: 6,
  },
  patientContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
  },
  patientName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  noteContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  noteDate: {
    fontSize: 14,
    color: "#888",
    marginBottom: 5,
  },
  note: {
    fontSize: 16,
    marginBottom: 5,
  },
  });
