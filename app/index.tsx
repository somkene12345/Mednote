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
  const [testDuration, setTestDuration] = useState(24); // Default to 24 hours
  const [menuVisible, setMenuVisible] = useState(false);
  const [testEnded, setTestEnded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordCorrect, setPasswordCorrect] = useState(false);

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
    endDate.setHours(startDate.getHours() + testDuration);
    return endDate.toISOString().slice(0, 16).replace("T", " ");
  };

  const checkTestEnd = () => {
    if (!testStartTime) return;

    const startTime = new Date(testStartTime);
    const currentTime = new Date();
    const minutesDifference = (currentTime - startTime) / (1000 * 60);

    if (minutesDifference >= testDuration * 60) {
      setTestEnded(true);
    } else {
      setTestEnded(false);
    }
  };

  useEffect(() => {
    checkTestEnd();
  }, [testStartTime, testDuration]);

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

    const adjustedTestStartTime = new Date(testStartTime);
    adjustedTestStartTime.setMinutes(adjustedTestStartTime.getMinutes() - adjustedTestStartTime.getTimezoneOffset());

    const dataToSave = rows
      .map((row) => {
        if (row.action.trim() && row.symptom.trim()) {
          const startDate = new Date(adjustedTestStartTime);
          const endDate = new Date(startDate);
          endDate.setHours(startDate.getHours() + testDuration);

          return {
            Activity: row.action,
            Symptom: row.symptom,
            Comment: row.comment,
            TestStartTime: adjustedTestStartTime.toISOString().slice(0, 16).replace("T", " "),
            TestEndTime: endDate.toISOString().slice(0, 16).replace("T", " ")
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

  const handlePasswordSubmit = () => {
    if (password === "hellouzoma") {
      setPasswordCorrect(true);
      setModalVisible(false);
    } else {
      Alert.alert("Error", "Incorrect password. Please try again.");
    }
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
            editable={!testEnded}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hospital Id:</Text>
          <TextInput
            placeholder="Enter Your Hospital Id"
            style={styles.headerInput}
            value={hospitalNo}
            onChangeText={setHospitalNo}
            editable={!testEnded}
          />
        </View>
      </View>

      {/* Time inputs side by side */}
      <View style={styles.timeInputContainer}>
        <View style={styles.timeInputWrapper}>
          <Text style={styles.labelTi}>Test Start Time:</Text>
          <Text style={styles.teStTi}>
            <input
              type="datetime-local"
              style={styles.inputit}
              value={testStartTime}
              onChange={(e) => {
                const adjustedTime = new Date(e.target.value);
                adjustedTime.setHours(adjustedTime.getHours() + 1);
                setTestStartTime(adjustedTime.toISOString().slice(0, 16));
                setPasswordCorrect(false);
              }}
              disabled={testEnded}
              onFocus={() => {
                if (!passwordCorrect) setModalVisible(true);
              }}
            />
          </Text>
        </View>

        <View style={styles.timeInputWrapper}>
          <Text style={styles.label}>Test Duration:</Text>
          <select
            style={styles.durationSelect}
            value={testDuration}
            onChange={(e) => setTestDuration(parseInt(e.target.value))}
            disabled={testEnded}
          >
            <option value={24}>24 Hours</option>
            <option value={48}>48 Hours</option>
            <option value={168}>7 Days</option>
          </select>
        </View>
      </View>

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

      {modalVisible && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Enter Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handlePasswordSubmit}
            >
              <Text style={styles.modalButtonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: 'red' }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    width: "80%",
    alignItems: "center",
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    width: "100%",
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  modalButton: {
    backgroundColor: "#00FF7A",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    margin: 10,
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  timeInputWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  durationSelect: {
    fontSize: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    backgroundColor: '#fff',
    width: '100%',
  },
});
