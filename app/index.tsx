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
          onFocus={() => {
            if (!passwordCorrect) setModalVisible(true);
          }}
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

      {/* Password Modal */}
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
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  headerInput: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
  },
  labelTi: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  teStTi: {
    fontSize: 16,
    color: "black",
  },
  testEnded: {
    color: "red",
    fontSize: 16,
  },
  testEndTime: {
    fontSize: 16,
    color: "green",
  },
  scrollContainer: {
    marginBottom: 20,
  },
  tableContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    marginBottom: 15,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    width: "48%",
  },
  commentInput: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    width: "100%",
    marginBottom: 10,
  },
  fakeSubButton: {
    backgroundColor: "#00FF7A",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  addButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  menu: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: "white",
    borderRadius: 5,
    shadowColor: "black",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  menuItem: {
    padding: 10,
  },
  menuItemText: {
    fontSize: 16,
    color: "black",
  },
  toggleButton: {
    padding: 10,
    backgroundColor: "#00FF7A",
    borderRadius: 5,
    marginBottom: 10,
  },
  toggleButtonText: {
    color: "white",
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
    borderRadius: 5,
    width: "80%",
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalInput: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  modalButton: {
    backgroundColor: "#00FF7A",
    padding: 10,
    borderRadius: 5,
  },
  modalButtonText: {
    color: "white",
    textAlign: "center",
  },
});
