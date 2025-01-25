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
    setMenuVisible(false); // Close menu when an option is selected
  };

  const toggleMenu = () => {
    setMenuVisible((prev) => !prev);
  };

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

      <Text style={styles.labelTi}>Test Start Time:</Text>
      <Text style={styles.teStTi}>
        <input
          type="datetime-local"
          style={styles.inputit}
          value={testStartTime}
          onChange={(e) => setTestStartTime(e.target.value)}
        />
      </Text>

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
                />
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.fakeSubButton} onPress={saveData}>
          <Text style={styles.addButtonText}>Submit</Text>
        </TouchableOpacity>

        <View style={styles.menuWrapper}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
            <Text style={styles.menuButtonText}>Options</Text>
          </TouchableOpacity>

          {menuVisible && (
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={toggleComments}>
                <Text style={styles.menuItemText}>
                  {showComments ? "Hide Comments" : "Add Comments"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  headerInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  labelTi: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    paddingHorizontal: 10,
  },
  teStTi: {
    paddingHorizontal: 10,
  },
  inputit: {
    width: "100%",
    padding: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 10,
  },
  tableContainer: {
    marginHorizontal: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#f9f9f9",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#eaeaea",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tableRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    flex: 1,
    marginHorizontal: 5,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    marginTop: 10,
  },
  fakeSubButton: {
    marginHorizontal: 10,
    marginTop: 20,
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  menuWrapper: {
    marginTop: 20,
    alignItems: "center",
  },
  menuButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
  },
  menuButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  menuContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#eaeaea",
    borderRadius: 5,
  },
  menuItem: {
    paddingVertical: 10,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
  },
});
