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

  const calculateDurationHours = (startTimeStr: string, endTimeStr: string): number => {
    try {
      const start = new Date(startTimeStr.replace(" ", "T"));
      const end = new Date(endTimeStr.replace(" ", "T"));
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    } catch (e) {
      return 24; // Default fallback
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
        
        const groupedEntries = Object.keys(patientData)
          .filter(key => key !== "TestDetails" && key !== "key")
          .flatMap(timestamp => {
            const entry = patientData[timestamp]?.["0"];
            if (!entry) return [];
            
            return {
              timestamp,
              ...entry,
              calculatedDuration: calculateDurationHours(
                entry.TestStartTime, 
                entry.TestEndTime
              )
            };
          })
          .reduce((groups: any, entry) => {
            const startTime = entry.TestStartTime;
            if (!groups[startTime]) {
              groups[startTime] = {
                entries: [],
                testDuration: entry.calculatedDuration || 24
              };
            }
            groups[startTime].entries.push(entry);
            return groups;
          }, {});

        const sections = Object.keys(groupedEntries).map((startTime) => ({
          title: startTime,
          data: groupedEntries[startTime].entries,
          testDuration: groupedEntries[startTime].testDuration
        }));

        return {
          key: patientKey,
          sections,
        };
      });

      // Sort patients based on their latest test start time
      resultPatients.sort((a, b) => {
        const latestTestA = a.sections
          .flatMap((section: any) => section.data)
          .map((entry: any) => new Date(entry.TestStartTime).getTime())
          .sort((x, y) => y - x)[0]; // Get latest test time (most recent)

        const latestTestB = b.sections
          .flatMap((section: any) => section.data)
          .map((entry: any) => new Date(entry.TestStartTime).getTime())
          .sort((x, y) => y - x)[0]; // Get latest test time (most recent)

        return latestTestB - latestTestA; // Sort in descending order
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

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const snapshot = await get(ref(database, "entries/"));
        const data = snapshot.val();
        if (!data) {
          setPatients([]);
          return;
        }

        const allPatients = Object.keys(data).map((patientKey) => {
          const patientData = data[patientKey];
          
          const groupedEntries = Object.keys(patientData)
            .filter(key => key !== "TestDetails" && key !== "key")
            .flatMap(timestamp => {
              const entry = patientData[timestamp]?.["0"];
              if (!entry) return [];
              
              return {
                timestamp,
                ...entry,
                calculatedDuration: calculateDurationHours(
                  entry.TestStartTime, 
                  entry.TestEndTime
                )
              };
            })
            .reduce((groups: any, entry) => {
              const startTime = entry.TestStartTime;
              if (!groups[startTime]) {
                groups[startTime] = {
                  entries: [],
                  testDuration: entry.calculatedDuration || 24
                };
              }
              groups[startTime].entries.push(entry);
              return groups;
            }, {});

          const sections = Object.keys(groupedEntries).map((startTime) => ({
            title: startTime,
            data: groupedEntries[startTime].entries,
            testDuration: groupedEntries[startTime].testDuration
          }));

          return {
            key: patientKey,
            sections,
          };
        });

        // Sort patients by the latest test start time
        allPatients.sort((a, b) => {
          const latestTestA = a.sections
            .flatMap((section: any) => section.data)
            .map((entry: any) => new Date(entry.TestStartTime).getTime())
            .sort((x, y) => y - x)[0]; // Get latest test time (most recent)

          const latestTestB = b.sections
            .flatMap((section: any) => section.data)
            .map((entry: any) => new Date(entry.TestStartTime).getTime())
            .sort((x, y) => y - x)[0]; // Get latest test time (most recent)

          return latestTestB - latestTestA; // Sort in descending order
        });

        setPatients(allPatients);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

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
      console.error("Error deleting patient:", error);
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
        prevPatients.map((patient) =>
          patient.key === expandedPatient
            ? {
                ...patient,
                sections: patient.sections.map((section) => ({
                  ...section,
                  data: section.data.filter((entry) => entry.timestamp !== timestamp),
                })).filter((section) => section.data.length > 0),
              }
            : patient
        ).filter((patient) => patient.sections.length > 0)
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete test entry.");
      console.error("Error deleting test entry:", error);
    }
  };

  if (!authenticated) {
    return (
      <View>
        {/* Authentication form */}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <TextInput
          style={{ flex: 1 }}
          placeholder="Search by patient name or hospital no"
          value={searchQuery}
          onChangeText={handleChange}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={{ marginLeft: 10, backgroundColor: "blue", padding: 10, borderRadius: 6 }}
          onPress={handleSearch}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(Here’s the complete code for your `SearchPatientNotes` component, following your request to remove the styles and input section:

```tsx
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

  const calculateDurationHours = (startTimeStr: string, endTimeStr: string): number => {
    try {
      const start = new Date(startTimeStr.replace(" ", "T"));
      const end = new Date(endTimeStr.replace(" ", "T"));
      return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    } catch (e) {
      return 24; // Default fallback
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
        
        const groupedEntries = Object.keys(patientData)
          .filter(key => key !== "TestDetails" && key !== "key")
          .flatMap(timestamp => {
            const entry = patientData[timestamp]?.["0"];
            if (!entry) return [];
            
            return {
              timestamp,
              ...entry,
              calculatedDuration: calculateDurationHours(
                entry.TestStartTime, 
                entry.TestEndTime
              )
            };
          })
          .reduce((groups: any, entry) => {
            const startTime = entry.TestStartTime;
            if (!groups[startTime]) {
              groups[startTime] = {
                entries: [],
                testDuration: entry.calculatedDuration || 24
              };
            }
            groups[startTime].entries.push(entry);
            return groups;
          }, {});

        const sections = Object.keys(groupedEntries).map((startTime) => ({
          title: startTime,
          data: groupedEntries[startTime].entries,
          testDuration: groupedEntries[startTime].testDuration
        }));

        return {
          key: patientKey,
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

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const snapshot = await get(ref(database, "entries/"));
        const data = snapshot.val();
        if (!data) {
          setPatients([]);
          return;
        }

        const allPatients = Object.keys(data).map((patientKey) => {
          const patientData = data[patientKey];
          
          const groupedEntries = Object.keys(patientData)
            .filter(key => key !== "TestDetails" && key !== "key")
            .flatMap(timestamp => {
              const entry = patientData[timestamp]?.["0"];
              if (!entry) return [];
              
              return {
                timestamp,
                ...entry,
                calculatedDuration: calculateDurationHours(
                  entry.TestStartTime, 
                  entry.TestEndTime
                )
              };
            })
            .reduce((groups: any, entry) => {
              const startTime = entry.TestStartTime;
              if (!groups[startTime]) {
                groups[startTime] = {
                  entries: [],
                  testDuration: entry.calculatedDuration || 24
                };
              }
              groups[startTime].entries.push(entry);
              return groups;
            }, {});

          const sections = Object.keys(groupedEntries).map((startTime) => ({
            title: startTime,
            data: groupedEntries[startTime].entries,
            testDuration: groupedEntries[startTime].testDuration
          }));

          return {
            key: patientKey,
            sections,
          };
        });

        setPatients(allPatients);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

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
      console.error("Error deleting patient:", error);
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
        prevPatients.map((patient) =>
          patient.key === expandedPatient
            ? {
                ...patient,
                sections: patient.sections.map((section) => ({
                  ...section,
                  data: section.data.filter((entry) => entry.timestamp !== timestamp),
                })).filter((section) => section.data.length > 0),
              }
            : patient
        ).filter((patient) => patient.sections.length > 0)
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete test entry.");
      console.error("Error deleting test entry:", error);
    }
  };

  if (!authenticated) {
    return (
      <View>
        <Text>Enter Password to Access Notes</Text>
        <TextInput
          secureTextEntry
          placeholder="Enter Password"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={handlePasswordSubmit}>
          <Text>Submit</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <TextInput
          placeholder="Search by patient name or hospital no"
          value={searchQuery}
          onChangeText={handleChange}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch}>
          <Text>🔍</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View>
              <View>
                <TouchableOpacity onPress={() => togglePatientDetails(item.key)}>
                  <Text>{item.key}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={() => confirmDeletePatient(item.key)}>
                  <Text>🗑️</Text>
                </TouchableOpacity>
              </View>

              {expandedPatient === item.key && (
                <View>
                  <SectionList
                    sections={item.sections}
                    renderSectionHeader={({ section }) => {
                      const startTime = new Date(section.title.replace(" ", "T"));
                      const endTime = new Date(startTime.getTime() + (section.testDuration || 24) * 60 * 60 * 1000);

                      const hasEnded = new Date() > endTime;

                      const formatDate = (date: Date) => {
                        return date.toLocaleString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        });
                      };

                      const testType = section.data?.[0]?.TestType || "Holter";

                      return (
                        <View>
                          <Text>Test Start: {formatDate(startTime)}</Text>
                          <Text>Test End: {formatDate(endTime)}</Text>
                          <Text>Type: {testType}</Text>
                          <Text>Duration: {section.testDuration || 24} hours</Text>
                          <Text>{hasEnded ? "Completed" : "Ongoing"}</Text>
                        </View>
                      );
                    }}
                    renderItem={({ item }) => (
                      <View>
                        <Text>{new Date(item.timestamp.replace(" ", "T")).toLocaleString()}</Text>
                        <Text>Activity: {item.Activity}</Text>
                        <Text>Symptom: {item.Symptom}</Text>
                        {item.Comment && item.Comment.trim() !== "" && (
                          <Text>Comments: {item.Comment}</Text>
                        )}
                        {item.SleepTime && item.WakeTime && (
                          <>
                            <Text>Sleep Time: {item.SleepTime}</Text>
                            <Text>Wake Time: {item.WakeTime}</Text>
                          </>
                        )}

                        <TouchableOpacity onPress={() => confirmDeleteTestEntry(item.timestamp, item)}>
                          <Text>🗑️ Delete Entry</Text>
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
        <View>
          <View>
            <Text>{modalType === "patient" ? "Delete Patient?" : "Delete Test Entry?"}</Text>
            <Text>{modalType === "patient" ? "This will delete ALL records for this patient. Continue?" : "Are you sure you want to delete this test entry?"}</Text>

            {modalType === "test" && selectedTestActivity && (
              <View>
                <Text>Details:</Text>
                <Text>Activity: {selectedTestActivity.Activity}</Text>
                <Text>Symptom: {selectedTestActivity.Symptom}</Text>
                <Text>Recorded: {new Date(selectedTestActivity.timestamp.replace(" ", "T")).toLocaleString()}</Text>
              </View>
            )}

            <View>
              <TouchableOpacity
                onPress={() => {
                  if (modalType === "patient" && selectedPatientKey) {
                    deletePatient(selectedPatientKey);
                  } else if (modalType === "test" && selectedTestTimestamp) {
                    deleteTestEntry(selectedTestTimestamp);
                  }
                  setModalVisible(false);
                }}
              >
                <Text>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
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
  sectionHeader: {
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginTop: 10,
  },
  sectionHeaderText: {
    fontSize: 16,
    marginBottom: 3,
  },
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    flex: 1,
  },
  deleteButton: {
    backgroundColor: "red",
    marginRight: 10,
  },
  cancelButton: {
    backgroundColor: "gray",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
  },
});
