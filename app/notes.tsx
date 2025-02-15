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
import { database } from "../firebaseConfig"; // Firebase configuration
import { ref, get } from "firebase/database";

export default function SearchPatientNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const correctPassword = "hellouzoma";

  // Handle password submission
  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setAuthenticated(true);
      setPassword(""); // Clear password field
    } else {
      Alert.alert("Incorrect Password", "Please try again.");
    }
  };

  // Function to handle search logic
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

      const resultPatients = results.map((patientKey) => processPatientData(patientKey, data[patientKey]));

      setPatients(resultPatients);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Function to process patient data and fix timestamps
  const processPatientData = (patientKey: string, patientData: any) => {
    const testDetails = patientData.TestDetails || {};

    // Group entries by TestStartTime
    const groupedEntries = Object.keys(patientData)
      .filter((key) => key !== "TestDetails" && key !== "key")
      .map((timestamp) => ({
        timestamp: fixTimestamp(timestamp), // Fixing timestamp issue here
        ...patientData[timestamp]["0"], // Accessing data under "0"
      }))
      .reduce((groups, entry) => {
        const startTime = entry.TestStartTime;
        if (!groups[startTime]) {
          groups[startTime] = [];
        }
        groups[startTime].push(entry);
        return groups;
      }, {});

    // Convert grouped entries into a format for SectionList
    const sections = Object.keys(groupedEntries).map((startTime) => ({
      title: startTime,
      data: groupedEntries[startTime],
    }));

    return {
      key: patientKey,
      testDetails,
      sections,
    };
  };

  // Function to adjust timestamp issue (fixing 1-hour late problem)
  const fixTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    date.setHours(date.getHours() - 1); // Adjusting by -1 hour
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  useEffect(() => {
    // Fetch all patients initially
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const snapshot = await get(ref(database, "entries/"));
        const data = snapshot.val();

        if (!data) {
          setPatients([]);
          return;
        }

        const allPatients = Object.keys(data).map((patientKey) =>
          processPatientData(patientKey, data[patientKey])
        );

        setPatients(allPatients);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
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
      <TextInput
        style={styles.input}
        placeholder="Search by patient name or hospital no"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.patientContainer}>
              <TouchableOpacity onPress={() => setExpandedPatient(expandedPatient === item.key ? null : item.key)}>
                <Text style={styles.patientName}>{item.key}</Text>
              </TouchableOpacity>
              {expandedPatient === item.key && (
                <View>
                  {item.testDetails.TestStartTime && item.testDetails.TestEndTime && (
                    <View style={styles.testDetailsContainer}>
                      <Text style={styles.testDetail}>Test Start Time: {item.testDetails.TestStartTime}</Text>
                      <Text style={styles.testDetail}>Test End Time: {item.testDetails.TestEndTime}</Text>
                    </View>
                  )}

                  <SectionList
                    sections={item.sections.reverse()}
                    keyExtractor={(entry, index) => entry.timestamp + index}
                    renderSectionHeader={({ section: { title } }) => (
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderText}>Test Start Time: {title}</Text>
                      </View>
                    )}
                    renderItem={({ item }) => (
                      <View style={styles.noteContainer}>
                        <Text style={styles.noteDate}>{item.timestamp}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  authText: { fontSize: 18, marginBottom: 20 },
  authInput: { height: 40, width: "80%", borderColor: "gray", borderWidth: 1, marginBottom: 20, paddingLeft: 10 },
  authButton: { backgroundColor: "#007AFF", padding: 10, borderRadius: 6 },
  authButtonText: { color: "#fff", fontWeight: "bold" },
  container: { flex: 1, padding: 20 },
  input: { height: 40, borderColor: "gray", borderWidth: 1, marginBottom: 20, paddingLeft: 10 },
  patientContainer: { marginBottom: 20, borderWidth: 1, padding: 10, backgroundColor: "#fff" },
  patientName: { fontSize: 18, fontWeight: "bold" },
  noteContainer: { padding: 10, backgroundColor: "#f9f9f9", borderRadius: 6 },
  noteDate: { fontSize: 14, color: "#888" },
  note: { fontSize: 16 },
});
