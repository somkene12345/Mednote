import React, { useState, useEffect } from "react";
import { Alert, TextInput, View, ScrollView, TouchableOpacity } from "react-native";
import { ref, set, push } from "firebase/database";
import { database } from "../firebaseConfig";

export default function Index() {
  const [rows, setRows] = useState([{ action: "", symptom: "", comment: "" }]);
  const [name, setName] = useState("");
  const [hospitalNo, setHospitalNo] = useState("");
  const [testStartTime, setTestStartTime] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [testEnded, setTestEnded] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem("name");
    const savedHospitalNo = localStorage.getItem("hospitalNo");
    const savedTestStartTime = localStorage.getItem("testStartTime");

    if (savedName) setName(savedName);
    if (savedHospitalNo) setHospitalNo(savedHospitalNo);
    if (savedTestStartTime) setTestStartTime(savedTestStartTime);
  }, []);

  useEffect(() => {
    localStorage.setItem("name", name);
    localStorage.setItem("hospitalNo", hospitalNo);
    localStorage.setItem("testStartTime", testStartTime);
  }, [name, hospitalNo, testStartTime]);

  const calculateTestEndTime = (startTime) => {
    const startDate = new Date(startTime);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 24);
    return endDate.toISOString().slice(0, 16).replace("T", " ");
  };

  const checkTestEnd = () => {
    const endTime = calculateTestEndTime(testStartTime);
    const currentTime = new Date().toISOString().slice(0, 16);
    if (currentTime >= endTime) {
      setTestEnded(true);
    }
  };

  useEffect(() => {
    if (testStartTime) {
      checkTestEnd();
    }
  }, [testStartTime]);

  const saveData = () => {
    if (testEnded) {
      Alert.alert("Test Ended", "You cannot submit data. The test has ended.");
      return;
    }

    if (!name.trim() || !hospitalNo.trim() || !testStartTime.trim()) {
      Alert.alert("Error", "Please provide a name, hospital number, and test start time.");
      return;
    }

    const groupKey = `${name}-${hospitalNo}`;
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

    const startDate = new Date(testStartTime);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 24);
    const testEndTime = endDate.toISOString().slice(0, 16).replace("T", " ");

    const dataToSave = rows
      .map((row) => {
        if (row.action.trim() && row.symptom.trim()) {
          return {
            Activity: row.action,
            Symptom: row.symptom,
            Comment: row.comment,
          };
        }
        return null;
      })
      .filter(Boolean);

    if (dataToSave.length === 0) {
      Alert.alert("Error", "Please complete the rows before submitting.");
      return;
    }

    // Push data to Firebase under the new structure
    const newEntryRef = ref(database, `entries/${groupKey}/${testStartTime}-${testEndTime}/`);
    const newRowRef = push(newEntryRef);

    set(newRowRef, {
      timestamp,
      data: dataToSave,
    })
      .then(() => {
        Alert.alert("Success", "Data saved successfully!");
        setRows([{ action: "", symptom: "", comment: "" }]); // Reset rows after saving
      })
      .catch((error) => {
        Alert.alert("Error", "Failed to save data.");
        console.error("Error saving data:", error);
      });
  };

  const toggleComments = () => {
    setShowComments((prev) => !prev);
  };

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        placeholder="Enter Your Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        placeholder="Enter Your Hospital Id"
        value={hospitalNo}
        onChangeText={setHospitalNo}
      />

      <TextInput
        type="datetime-local"
        value={testStartTime}
        onChange={(e) => setTestStartTime(e.target.value)}
      />

      {testStartTime && (
        <Text>
          {testEnded
            ? "Test has ended. You cannot add another entry."
            : `Test ends by: ${calculateTestEndTime(testStartTime)}`}
        </Text>
      )}

      <ScrollView>
        {rows.map((row, index) => (
          <View key={index}>
            <TextInput
              placeholder="What are you doing?"
              value={row.action}
              onChangeText={(text) => {
                const updatedRows = [...rows];
                updatedRows[index].action = text;
                setRows(updatedRows);
              }}
              editable={!testEnded}
            />
            <TextInput
              placeholder="What are you feeling?"
              value={row.symptom}
              onChangeText={(text) => {
                const updatedRows = [...rows];
                updatedRows[index].symptom = text;
                setRows(updatedRows);
              }}
              editable={!testEnded}
            />
            {showComments && (
              <TextInput
                placeholder="Add a comment"
                value={row.comment}
                onChangeText={(text) => {
                  const updatedRows = [...rows];
                  updatedRows[index].comment = text;
                  setRows(updatedRows);
                }}
                editable={!testEnded}
              />
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity onPress={saveData} disabled={testEnded}>
        <Text>Submit</Text>
      </TouchableOpacity>
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
});
