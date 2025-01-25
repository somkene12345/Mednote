import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { ref, set } from "firebase/database";
import { database } from "../firebaseConfig";

export default function Index() {
  const [rows, setRows] = useState([{ action: "", symptom: "", comment: "" }]);
  const [name, setName] = useState("");
  const [hospitalNo, setHospitalNo] = useState("");
  const [testStartTime, setTestStartTime] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [testEnded, setTestEnded] = useState(false);

  // Load data from local storage on initial render
  useEffect(() => {
    const savedName = localStorage.getItem("name");
    const savedHospitalNo = localStorage.getItem("hospitalNo");
    const savedTestStartTime = localStorage.getItem("testStartTime");

    if (savedName) setName(savedName);
    if (savedHospitalNo) setHospitalNo(savedHospitalNo);
    if (savedTestStartTime) setTestStartTime(savedTestStartTime);
  }, []);

  // Autosave data to local storage
  useEffect(() => {
    localStorage.setItem("name", name);
    localStorage.setItem("hospitalNo", hospitalNo);
    localStorage.setItem("testStartTime", testStartTime);
  }, [name, hospitalNo, testStartTime]);

  // Calculate the test end time by adding 24 hours to the start time
  const calculateTestEndTime = (startTime) => {
    const startDate = new Date(startTime);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 24);
    return endDate.toISOString().slice(0, 16).replace("T", " ");
  };

  // Check if test has ended
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
    if (!name.trim() || !hospitalNo.trim() || !testStartTime.trim()) {
      Alert.alert("Error", "Please provide a name, hospital number, and test start time.");
      return;
    }

    const groupKey = `${name}-${hospitalNo}`;
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

    const dataToSave = rows
      .map((row) => {
        if (row.action.trim() && row.symptom.trim()) {
          const startDate = new Date(testStartTime);
          const endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + 25);

          return {
            Activity: row.action,
            Symptom: row.symptom,
            Comment: row.comment,
            TestStartTime: testStartTime.slice(0, 16).replace("T", " "),
            TestEndTime: endDate.toISOString().slice(0, 16).replace("T", " "),
          };
        }
        return null;
      })
      .filter(Boolean); // Remove empty rows

    if (dataToSave.length === 0) {
      Alert.alert("Error", "Please complete the rows before submitting.");
      return;
    }

    const newEntryRef = ref(database, `entries/${groupKey}/${timestamp}`);

    set(newEntryRef, dataToSave)
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
    setMenuVisible(false); // Close the menu after toggling comments
  };

  const toggleMenu = () => setMenuVisible(!menuVisible);

  const addRow = () => {
    if (testEnded) {
      Alert.alert("Test Ended", "The test has ended. You cannot add more entries.");
    } else {
      setRows([...rows, { action: "", symptom: "", comment: "" }]);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header Inputs */}
      <View style={styles.headerContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name:</Text>
          <TextInput
            placeholder="Enter Your Name"
            style={styles.headerInput}
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hospital Id:</Text>
          <TextInput
            placeholder="Enter Your Hospital Id"
            style={styles.headerInput}
            value={hospitalNo}
            onChangeText={setHospitalNo}
          />
        </View>
      </View>

      {/* Test Start Time */}
      <Text style={styles.labelTi}>Test Start Time:</Text>
      <Text style={styles.teStTi}>
        <input
          type="datetime-local"
          style={styles.inputit}
          value={testStartTime}
          onChange={(e) => setTestStartTime(e.target.value)}
        />
      </Text>

      {/* Test End Time */}
      {testStartTime && (
        <Text style={testEnded ? styles.testEnded : styles.testEndTime}>
          {testEnded ? "Test has ended. You cannot add another entry." : `Test ends by: ${calculateTestEndTime(testStartTime)}`}
        </Text>
      )}

      {/* Table */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Activity</Text>
            <Text style={styles.headerText}>Symptom</Text>
          </View>

          {rows.map((row, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.rowTop}>
                <TextInput
                  placeholder="What are you doing?"
                  style={styles.input}
                  value={row.action}
                  multiline
                  scrollEnabled
                  onChangeText={(text) => {
                    const updatedRows = [...rows];
                    updatedRows[index].action = text;
                    setRows(updatedRows);
                  }}
                  editable={!testEnded} // Disable input if test has ended
                />
                <TextInput
                  placeholder="What are you feeling?"
                  style={styles.input}
                  value={row.symptom}
                  multiline
                  scrollEnabled
                  onChangeText={(text) => {
                    const updatedRows = [...rows];
                    updatedRows[index].symptom = text;
                    setRows(updatedRows);
                  }}
                  editable={!testEnded} // Disable input if test has ended
                />
              </View>
              {showComments && (
                <TextInput
                  placeholder="Add a comment"
                  style={styles.commentInput}
                  value={row.comment}
                  multiline
                  scrollEnabled
                  onChangeText={(text) => {
                    const updatedRows = [...rows];
                    updatedRows[index].comment = text;
                    setRows(updatedRows);
                  }}
                  editable={!testEnded} // Disable input if test has ended
                />
              )}
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.fakeSubButton} onPress={saveData} disabled={testEnded}>
          <Text style={styles.addButtonText}>Submit</Text>
        </TouchableOpacity>

        {/* Options Menu */}
        {menuVisible && (
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={toggleComments}>
              <Text style={styles.menuItemText}>
                {showComments ? "Hide Comments" : "Add Comments"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={toggleMenu}>
              <Text style={styles.menuItemText}>Close Menu</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Toggle Button to show options menu */}
        {!menuVisible && (
          <TouchableOpacity style={styles.toggleButton} onPress={toggleMenu}>
            <Text style={styles.toggleButtonText}>Options</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Button to add a new row */}
      {!testEnded && (
        <TouchableOpacity style={styles.fakeSubButton} onPress={addRow}>
          <Text style={styles.addButtonText}>Add New Row</Text>
        </TouchableOpacity>
      )}
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
