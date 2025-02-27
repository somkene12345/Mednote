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
import { database } from "../firebaseConfig"; // Assuming this is where your firebase config is stored
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
const [selectedTestActivity, setSelectedTestActivity] = useState<string | null>(null);


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

        setPatients(allPatients);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);
// Confirm delete entire patient
const confirmDeletePatient = (patientKey: string) => {
  setSelectedPatientKey(patientKey);
  setModalType("patient");
  setModalVisible(true);
};


// Delete entire patient record
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

// Confirm delete single test entry
const confirmDeleteTestEntry = (timestamp: string, testEntry: any) => {
  setSelectedTestTimestamp(timestamp);
  setSelectedTestActivity(testEntry); // Store the full test entry object
  setModalType("test");
  setModalVisible(true);
};



// Delete individual test entry
const deleteTestEntry = async (timestamp: string) => {
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
<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
  <TextInput
    style={[styles.input, { flex: 1 }]}
    placeholder="Search by patient name or hospital no"
    value={searchQuery}
    onChangeText={handleChange}
    onSubmitEditing={handleSearch}
  />
  <TouchableOpacity
    style={{
      marginLeft: 10,
      backgroundColor: "blue",
      padding: 10,
      borderRadius: 6,
    }}
    onPress={handleSearch}
  >
    <Text style={{ color: "white", fontWeight: "bold" }}>🔄</Text>
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
  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
    <TouchableOpacity onPress={() => togglePatientDetails(item.key)}>
      <Text style={styles.patientName}>{item.key}</Text>
    </TouchableOpacity>
    
    <TouchableOpacity
      style={{
        backgroundColor: "red",
        padding: 6,
        borderRadius: 6,
      }}
      onPress={() => confirmDeletePatient(item.key)}
    >
      <Text style={{ color: "white", fontWeight: "bold" }}>🗑️</Text>
    </TouchableOpacity>
  </View>

  {expandedPatient === item.key && (
    <View>
      <SectionList
        sections={item.sections.reverse()}
        keyExtractor={(entry, index) => entry.timestamp + index}
        renderSectionHeader={({ section: { title } }) => {
          const startTime = new Date(title.replace(" ", "T"));
          const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

          endTime.setSeconds(0);
          endTime.setMilliseconds(0);

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

          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>
                Test Start Time: {formatDate(startTime)}
              </Text>
              <Text style={styles.sectionHeaderText}>
                Test End Time: {formatDate(endTime)}
              </Text>
              <Text style={styles.sectionHeaderText}>
                {hasEnded ? "Test has ended" : "Test is ongoing"}
              </Text>
            </View>
          );
        }}
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
                  hour12: false,
                })
                .replace(",", "")}
            </Text>
            <Text style={styles.note}>Activity: {item.Activity}</Text>
            <Text style={styles.note}>Symptom: {item.Symptom}</Text>
            {item.Comment && item.Comment.trim() !== "" && (
              <Text style={styles.note}>Comments: {item.Comment}</Text>
            )}

            {/* Delete Individual Test Entry Button */}
            <TouchableOpacity
              style={{
                marginTop: 5,
                backgroundColor: "red",
                padding: 6,
                borderRadius: 6,
                alignSelf: "flex-start",
              }}
              onPress={() => confirmDeleteTestEntry(item.timestamp, item)}

            >
              <Text style={{ color: "white", fontWeight: "bold" }}>🗑️ Delete</Text>
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
      {/* Modal for confirming deletion */}
{modalVisible && (
  <View style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  }}>
    <View style={{
      width: "80%",
      backgroundColor: "white",
      padding: 20,
      borderRadius: 10,
      alignItems: "center",
    }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        {modalType === "patient" ? "Delete Patient?" : "Delete Test Entry?"}
      </Text>

      <Text style={{ fontSize: 16, marginBottom: 10 }}>
        {modalType === "patient"
          ? "Are you sure you want to delete this patient and all their records?"
          : `Are you sure you want to delete the test entry?`}
      </Text>

{modalType === "test" && selectedTestActivity && (
  <>
    <Text style={{ fontSize: 14, marginBottom: 5 }}>
      <Text style={{ fontWeight: "bold" }}>Patient ID: </Text> 
      {expandedPatient} {/* The selected patient's ID */}
    </Text>
    <Text style={{ fontSize: 14, marginBottom: 5 }}>
      <Text style={{ fontWeight: "bold" }}>Timestamp: </Text> 
      {selectedTestTimestamp}
    </Text>
    {selectedTestActivity.Activity && (
      <Text style={{ fontSize: 14, marginBottom: 5 }}>
        <Text style={{ fontWeight: "bold" }}>Activity: </Text> 
        {selectedTestActivity.Activity}
      </Text>
    )}
    {selectedTestActivity.Symptom && (
      <Text style={{ fontSize: 14, marginBottom: 5 }}>
        <Text style={{ fontWeight: "bold" }}>Symptom: </Text> 
        {selectedTestActivity.Symptom}
      </Text>
    )}
    {selectedTestActivity.Comment && (
      <Text style={{ fontSize: 14, marginBottom: 10 }}>
        <Text style={{ fontWeight: "bold" }}>Comment: </Text> 
        {selectedTestActivity.Comment}
      </Text>
    )}
  </>
)}


      <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
        <TouchableOpacity
          style={{ backgroundColor: "red", padding: 10, borderRadius: 6, flex: 1, marginRight: 10, alignItems: "center" }}
          onPress={() => {
            if (modalType === "patient" && selectedPatientKey) {
              deletePatient(selectedPatientKey);
            } else if (modalType === "test" && selectedTestTimestamp) {
              deleteTestEntry(selectedTestTimestamp);
            }
            setModalVisible(false);
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: "gray", padding: 10, borderRadius: 6, flex: 1, alignItems: "center" }}
          onPress={() => setModalVisible(false)}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}


    </View>
  );
}


const styles = StyleSheet.create({
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
    refreshButton: {
    marginLeft: 10,
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
},
modalContent: {
  width: "80%",
  padding: 20,
  backgroundColor: "white",
  borderRadius: 10,
  alignItems: "center",
},
modalText: {
  fontSize: 18,
  textAlign: "center",
  marginBottom: 20,
},
modalButtons: {
  flexDirection: "row",
  justifyContent: "space-between",
  width: "100%",
},
modalButtonCancel: {
  backgroundColor: "gray",
  padding: 10,
  borderRadius: 6,
  flex: 1,
  alignItems: "center",
  marginRight: 10,
},
modalButtonDelete: {
  backgroundColor: "red",
  padding: 10,
  borderRadius: 6,
  flex: 1,
  alignItems: "center",
},
modalButtonText: {
  color: "white",
  fontWeight: "bold",
},
});
