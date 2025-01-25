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
  teStTi: {
    alignSelf: "center",
    width: "auto",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
    marginBottom: 20,
  },
  inputit: {
    fontFamily: "Arial, sans-serif",
    outline: "none",
    color: "#333",
    width: "auto",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    backgroundColor: "#fff",
    padding: 10,
    boxSizing: "border-box",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 20,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  labelTi: {
    fontSize: 16,
    marginBottom: 5,
    alignSelf: "center",
  },
  headerInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flex: 1,
  },
  tableContainer: {
    marginLeft: 20,
    marginRight: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#007AFF",
    padding: 10,
  },
  headerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
    flex: 1,
  },
  tableRow: {
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  input: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
  },
  commentInput: {
    marginHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
  },
  toggleButton: {
    backgroundColor: "#FFA500",
    padding: 10,
    margin: 15,
    borderRadius: 6,
    alignItems: "center",
    alignSelf: "center",
  },
  toggleButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  fakeSubButton: {
    backgroundColor: "#00FF7A",
    paddingTop: 10,
    paddingBottom: 10,
    margin: 15,
    borderRadius: 6,
    width: "95%",
    alignItems: "center",
    alignSelf: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  menu: {
    backgroundColor: "#f9f9f9",
    margin: 15,
    padding: 10,
    borderRadius: 6,
  },
  menuItem: {
    padding: 10,
  },
  menuItemText: {
    fontSize: 16,
    color: "#007AFF",
  },
  testEndTime: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  testEnded: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
});
