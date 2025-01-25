import React, { useState } from "react";
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
import { ref, get } from "firebase/database";

export default function SearchPatientNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false); // Authentication state
  const [password, setPassword] = useState(""); // Password input state
  const correctPassword = "hellouzoma"; // Correct password

  // Handle password submission
  const handlePasswordSubmit = () => {
    if (password === correctPassword) {
      setAuthenticated(true);
      setPassword(""); // Clear the password field
    } else {
      Alert.alert("Incorrect Password", "Please try again.");
    }
  };

  // Function to handle search logic
  const handleSearch = async () => {
    if (searchQuery.trim() === "") return;

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
        const testDetails = patientData.TestDetails || {}; // Extracting test details

        // Group entries by TestStartTime
        const groupedEntries = Object.keys(patientData)
          .filter((key) => key !== "TestDetails" && key !== "key")
          .map((timestamp) => ({
            timestamp,
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
          sections, // Grouped entries by TestStartTime
        };
      });

      setPatients(resultPatients);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle text input changes
  const handleChange = (text: string) => {
    setSearchQuery(text);
  };

  // Toggle the display of patient details
  const togglePatientDetails = (patientKey: string) => {
    setExpandedPatient((prev) => (prev === patientKey ? null : patientKey));
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
      <TextInput
        style={styles.input}
        placeholder="Search by patient name or hospital no"
        value={searchQuery}
        onChangeText={handleChange}
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
              <TouchableOpacity onPress={() => togglePatientDetails(item.key)}>
                <Text style={styles.patientName}>{item.key}</Text>
              </TouchableOpacity>
              {expandedPatient === item.key && (
                <View>
                  {/* Display Test Start Time and Test End Time once */}
                  {item.testDetails.TestStartTime && item.testDetails.TestEndTime && (
                    <View style={styles.testDetailsContainer}>
                      <Text style={styles.testDetail}>Test Start Time: {item.testDetails.TestStartTime}</Text>
                      <Text style={styles.testDetail}>Test End Time: {item.testDetails.TestEndTime}</Text>
                    </View>
                  )}

<SectionList
  sections={item.sections}
  keyExtractor={(entry, index) => entry.timestamp + index}
  renderSectionHeader={({ section: { title } }) => {
    // Convert TestStartTime (with space instead of 'T') to Date object
    const startTime = new Date(title.replace(" ", "T")); // Convert "2025-01-25 14:00" to "2025-01-25T14:00"

    // Add 25 hours to the TestStartTime and round to the nearest minute
    const endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000); // 25 hours in milliseconds

    // Round endTime to nearest minute by resetting seconds and milliseconds
    endTime.setSeconds(0);
    endTime.setMilliseconds(0);

    // Determine if the test has ended (current time is after TestEndTime)
    const hasEnded = new Date() > endTime;

    // Format the date to only include up to the minute (YYYY-MM-DD HH:mm)
    const formatDate = (date: Date) => {
      return date.toISOString().slice(0, 16).replace("T", " "); // "2025-01-25 14:00"
    };

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>
          Test Start Time: {formatDate(startTime)} {/* Display Test Start Time */}
        </Text>
        <Text style={styles.sectionHeaderText}>
          Test End Time: {formatDate(endTime)} {/* Display the calculated Test End Time */}
        </Text>
        <Text style={styles.sectionHeaderText}>
          {hasEnded ? "Test has ended" : "Test is ongoing"} {/* Display test status */}
        </Text>
      </View>
    );
  }}
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
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
  },
  noteDate: {
    fontSize: 14,
    color: "#888",
  },
  note: {
    fontSize: 16,
    marginTop: 5,
  },
});
