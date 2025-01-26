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
    endDate.setHours(startDate.getHours() + 25);
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
      .filter(Boolean);

    if (dataToSave.length === 0) {
      Alert.alert("Error", "Please complete the rows before submitting.");
      return;
    }

    const newEntryRef = ref(database, `entries/${groupKey}/${timestamp}`);

    set(newEntryRef, dataToSave)
      .then(() => {
        Alert.alert("Success", "Data saved successfully!");
        setRows([{ action: "", symptom: "", comment: "" }]);
      })
      .catch((error) => {
        Alert.alert("Error", "Failed to save data.");
        console.error("Error saving data:", error);
      });
  };

  const toggleComments = () => {
    setShowComments((prev) => !prev);
    setMenuVisible(false);
  };

  const toggleMenu = () => setMenuVisible(!menuVisible);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.headerContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name:</Text>
          <TextInput
            placeholder="Enter Your Name"
            style={styles.headerInput}
            value={name}
            onChangeText={setName}
            editable
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hospital Id:</Text>
          <TextInput
            placeholder="Enter Your Hospital Id"
            style={styles.headerInput}
            value={hospitalNo}
            onChangeText={setHospitalNo}
            editable
          />
        </View>
      </View>
      <Text style={styles.labelTi}>Test Start Time:</Text>
      <Text style={styles.teStTi}>
        <input
          type="datetime-local"
          style={styles.inputit}
          value={testStartTime}
          onChange={(e) => setTestStartTime(e.target.value)}
          disabled={false}
        />
      </Text>
      {testStartTime && (
        <Text style={testEnded ? styles.testEnded : styles.testEndTime}>
          {testEnded
            ? "Test has ended. You cannot add another entry."
            : `Test ends by: ${calculateTestEndTime(testStartTime)}`}
        </Text>
      )}
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
                  editable={!testEnded}
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
                  editable={!testEnded}
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
                  editable={!testEnded}
                />
              )}
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.fakeSubButton}
          onPress={saveData}
          disabled={testEnded}
        >
          <Text style={styles.addButtonText}>Submit</Text>
        </TouchableOpacity>
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
        {!menuVisible && (
          <TouchableOpacity style={styles.toggleButton} onPress={toggleMenu}>
            <Text style={styles.toggleButtonText}>Options</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginTop: 5,
  },
  labelTi: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
  },
  teStTi: {
    fontSize: 16,
    marginTop: 10,
  },
  testEnded: {
    color: "red",
    fontSize: 16,
    marginTop: 10,
  },
  testEndTime: {
    fontSize: 16,
    marginTop: 10,
  },
  scrollContainer: {
    flex: 1,
    marginBottom: 20,
  },
  tableContainer: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f1f1f1",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
  },
  fakeSubButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    marginTop: 20,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  menu: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    position: "absolute",
    top: 40,
    right: 10,
  },
  menuItem: {
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 16,
  },
  toggleButton: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 20,
  },
  toggleButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
