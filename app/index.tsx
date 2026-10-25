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
  const [testDuration, setTestDuration] = useState(24);
  const [menuVisible, setMenuVisible] = useState(false);
  const [testEnded, setTestEnded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordCorrect, setPasswordCorrect] = useState(false);
  const [testType, setTestType] = useState("Holter");
  const [sleepTime, setSleepTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const savedName = localStorage.getItem("name");
        const savedHospitalNo = localStorage.getItem("hospitalNo");
        const savedTestStartTime = localStorage.getItem("testStartTime");
        const savedSleepTime = localStorage.getItem("sleepTime");
        const savedWakeTime = localStorage.getItem("wakeTime");
        const savedTestType = localStorage.getItem("testType");

        if (savedName) setName(savedName);
        if (savedHospitalNo) setHospitalNo(savedHospitalNo);
        if (savedTestStartTime) setTestStartTime(savedTestStartTime);
        if (savedSleepTime) setSleepTime(savedSleepTime);
        if (savedWakeTime) setWakeTime(savedWakeTime);
        if (savedTestType) setTestType(savedTestType);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("name", name);
        localStorage.setItem("hospitalNo", hospitalNo);
        localStorage.setItem("testStartTime", testStartTime);
        localStorage.setItem("sleepTime", sleepTime);
        localStorage.setItem("wakeTime", wakeTime);
        localStorage.setItem("testType", testType);
      }
    } catch (e) {}
  }, [name, hospitalNo, testStartTime, sleepTime, wakeTime, testType]);

  const calculateTestEndTime = (startTime: string) => {
    if (!startTime) return "";
    const startDate = new Date(startTime);
    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + testDuration);

    const month = String(endDate.getMonth() + 1).padStart(2, "0");
    const day = String(endDate.getDate()).padStart(2, "0");
    const year = endDate.getFullYear();
    const timePart = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${month}/${day}/${year} ${timePart}`;
  };

  const checkTestEnd = () => {
    if (!testStartTime) return;
    const startTime = new Date(testStartTime);
    const currentTime = new Date();
    const minutesDifference = (currentTime.getTime() - startTime.getTime()) / (1000 * 60);

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

    const groupKey = `${name.trim()}-${hospitalNo.trim()}`;
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
            TestEndTime: endDate.toISOString().slice(0, 16).replace("T", " "),
            TestType: testType,
            SleepTime: testType === "ABP" ? sleepTime : "",
            WakeTime: testType === "ABP" ? wakeTime : "",
          };
        }
        return null;
      })
      .filter(Boolean);

    if (dataToSave.length === 0) {
      Alert.alert("Error", "Please complete the activity and symptom fields before submitting.");
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
      setPassword("");
    } else {
      Alert.alert("Error", "Incorrect password. Please try again.");
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Patient Info Card */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeaderTitle}>Patient Registration</Text>
          <View style={styles.headerRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Patient Name</Text>
              <TextInput
                placeholder="Enter Full Name"
                placeholderTextColor="#64748B"
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                editable={!testEnded}
                autoComplete="off"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Hospital ID</Text>
              <TextInput
                placeholder="Enter Hospital ID"
                placeholderTextColor="#64748B"
                style={styles.textInput}
                value={hospitalNo}
                onChangeText={setHospitalNo}
                editable={!testEnded}
                autoComplete="off"
              />
            </View>
          </View>

          {/* Time and Test Parameters */}
          <View style={styles.timeInputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Test Start Time</Text>
              <input
                type="datetime-local"
                style={{
                  width: "100%",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  color: "#F8FAFC",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "10px",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={testStartTime}
                onChange={(e: any) => {
                  const adjustedTime = new Date(e.target.value);
                  adjustedTime.setHours(adjustedTime.getHours() + 1);
                  setTestStartTime(adjustedTime.toISOString().slice(0, 16));
                  setPasswordCorrect(false);
                }}
                onFocus={() => {
                  if (!passwordCorrect) setModalVisible(true);
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration</Text>
              <select
                style={{
                  width: "100%",
                  backgroundColor: "rgba(15, 23, 42, 0.6)",
                  color: "#F8FAFC",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "10px",
                  padding: "10px",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={testDuration}
                onChange={(e: any) => setTestDuration(parseInt(e.target.value))}
                disabled={testEnded}
              >
                <option value={24} style={{ backgroundColor: "#0F172A", color: "#F8FAFC" }}>24 Hours</option>
                <option value={48} style={{ backgroundColor: "#0F172A", color: "#F8FAFC" }}>48 Hours</option>
                <option value={168} style={{ backgroundColor: "#0F172A", color: "#F8FAFC" }}>7 Days (168 Hours)</option>
              </select>
            </View>
          </View>

          {testType === "ABP" && (
            <View style={styles.timeInputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sleep Time</Text>
                <input
                  type="time"
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    color: "#F8FAFC",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  value={sleepTime}
                  onChange={(e: any) => setSleepTime(e.target.value)}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Wake Time</Text>
                <input
                  type="time"
                  style={{
                    width: "100%",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    color: "#F8FAFC",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "10px",
                    padding: "10px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  value={wakeTime}
                  onChange={(e: any) => setWakeTime(e.target.value)}
                />
              </View>
            </View>
          )}

          {testStartTime !== "" && (
            <View style={[styles.statusBadge, testEnded ? styles.statusEnded : styles.statusActive]}>
              <Text style={styles.statusText}>
                {testEnded
                  ? "⚠️ Test Duration Complete (Entry Disabled)"
                  : `⏳ Active Test ends by: ${calculateTestEndTime(testStartTime)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Activity & Symptom Entry Section */}
        <View style={styles.glassCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Symptom Log ({testType} Mode)</Text>
            <TouchableOpacity style={styles.optionsPill} onPress={toggleMenu}>
              <Text style={styles.optionsPillText}>⚙️ Options</Text>
            </TouchableOpacity>
          </View>

          {rows.map((row, index) => (
            <View key={index} style={styles.entryRowCard}>
              <View style={styles.inputsRow}>
                <View style={styles.flexInput}>
                  <Text style={styles.subLabel}>Activity</Text>
                  <TextInput
                    placeholder="e.g. Walking up stairs"
                    placeholderTextColor="#64748B"
                    style={styles.textInputArea}
                    value={row.action}
                    multiline
                    onChangeText={(text) => {
                      const updatedRows = [...rows];
                      updatedRows[index].action = text;
                      setRows(updatedRows);
                    }}
                    editable={!testEnded}
                    autoComplete="off"
                  />
                </View>
                <View style={styles.flexInput}>
                  <Text style={styles.subLabel}>Symptom</Text>
                  <TextInput
                    placeholder="e.g. Chest tightness"
                    placeholderTextColor="#64748B"
                    style={styles.textInputArea}
                    value={row.symptom}
                    multiline
                    onChangeText={(text) => {
                      const updatedRows = [...rows];
                      updatedRows[index].symptom = text;
                      setRows(updatedRows);
                    }}
                    editable={!testEnded}
                    autoComplete="off"
                  />
                </View>
              </View>

              {showComments && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.subLabel}>Additional Clinical Comments</Text>
                  <TextInput
                    placeholder="Enter any additional observations..."
                    placeholderTextColor="#64748B"
                    style={styles.textInputArea}
                    value={row.comment}
                    multiline
                    onChangeText={(text) => {
                      const updatedRows = [...rows];
                      updatedRows[index].comment = text;
                      setRows(updatedRows);
                    }}
                    editable={!testEnded}
                    autoComplete="off"
                  />
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primarySubmitBtn, testEnded && { opacity: 0.5 }]}
            onPress={saveData}
            disabled={testEnded}
          >
            <Text style={styles.primarySubmitBtnText}>Submit Patient Log Entry</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Popover Options Menu */}
      {menuVisible && (
        <View style={styles.menuOverlay}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>Configuration Menu</Text>
            <TouchableOpacity style={styles.menuItem} onPress={toggleComments}>
              <Text style={styles.menuItemText}>
                {showComments ? "🙈 Hide Comments Field" : "💬 Add Comments Field"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setTestType(testType === "Holter" ? "ABP" : "Holter");
                setMenuVisible(false);
              }}
            >
              <Text style={styles.menuItemText}>
                🔄 Switch to {testType === "Holter" ? "ABP" : "Holter"} Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setMenuVisible(false)}>
              <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Close Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Password Authorization Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Security Authorization</Text>
            <Text style={styles.modalSubtitle}>Enter passcode to modify test schedule parameters.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter Password"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="off"
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={handlePasswordSubmit}>
                <Text style={styles.modalBtnText}>Authenticate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    padding: 16,
  },
  glassCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  timeInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94A3B8",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#38BDF8",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  entryRowCard: {
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  inputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  textInputArea: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 45,
  },
  statusBadge: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 6,
  },
  statusActive: {
    backgroundColor: "rgba(14, 165, 233, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  statusEnded: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "600",
  },
  primarySubmitBtn: {
    backgroundColor: "#0284C7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  primarySubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  optionsPill: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  optionsPillText: {
    color: "#38BDF8",
    fontWeight: "600",
    fontSize: 12,
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuCard: {
    width: "85%",
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 14,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  menuItemText: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 18,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#334155",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: "#0284C7",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});
