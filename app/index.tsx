import React, { useState } from "react";
import { StyleSheet, TextInput, View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { ref, set } from "firebase/database";
import { database } from "../firebaseConfig";

export default function Index() {
  const [rows, setRows] = useState([{ action: "", symptom: "" }]);
  const [name, setName] = useState("");
  const [hospitalNo, setHospitalNo] = useState("");
  const [testStartTime, setTestStartTime] = useState("");

  // Save data to Firebase
  const saveData = (data: any, index: number) => {
    if (!name.trim() || !hospitalNo.trim() || !testStartTime.trim()) {
      Alert.alert("Error", "Please provide a name, hospital number, and test start time.");
      return;
    }

    const groupKey = `${name}-${hospitalNo}`;
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");

    const newEntryRef = ref(database, `entries/${groupKey}/${timestamp}`);

    set(newEntryRef, data)
      .then(() => {
        Alert.alert("Success", "Data saved successfully!");
        const updatedRows = [...rows];
        updatedRows[index] = { action: "", symptom: "" };
        setRows(updatedRows);
      })
      .catch((error) => {
        Alert.alert("Error", "Failed to save data.");
        console.error("Error saving data:", error);
      });
  };

  // Handle blur to save data with calculated TestEndTime
  const handleBlur = (index: number) => {
    const currentRow = rows[index];
    if (currentRow.action.trim() && currentRow.symptom.trim()) {
      const startDate = new Date(testStartTime);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 25);

      const data = {
        Activity: currentRow.action,
        Symptom: currentRow.symptom,
        TestStartTime: testStartTime.slice(0, 16).replace("T", " "),
        TestEndTime: endDate.toISOString().slice(0, 16).replace("T", " ")
      };

      saveData(data, index);
    }
  };

  const addRow = () => {
    setRows([...rows, { action: "", symptom: "" }]);
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

      {/* Table */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.headerText}>Activity</Text>
            <Text style={styles.headerText}>Symptom</Text>
          </View>

          {rows.map((row, index) => (
            <View key={index} style={styles.tableRow}>
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
                onBlur={() => handleBlur(index)}
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
                onBlur={() => handleBlur(index)}
              />
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.fakeSubButton}>
          <Text style={styles.addButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Row Button */}
      <TouchableOpacity style={styles.addButton} onPress={addRow}>
        <Text style={styles.addButtonText}>Add Entry</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
  },
  input: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
  },
  fakeSubButton: {
    backgroundColor: "#00FF7A",
    padding: 10,
    margin: 15,
    borderRadius: 6,
    width: "auto",
    alignItems: "center",
    alignSelf: "center",
  },
  addButton: {
    backgroundColor: "#007AFF",
    padding: 15,
    margin: 20,
    borderRadius: 6,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
