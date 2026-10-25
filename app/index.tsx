import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ref, set } from "firebase/database";
import { database } from "../firebaseConfig";

export default function Index() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#121212' : '#F4F6F9',
    surface: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#E2E8F0' : '#1E293B',
    subText: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#2D2D2D' : '#E2E8F0',
    inputBg: isDark ? '#2A2A2A' : '#F8FAFC',
    primary: '#1D4ED8',
    primaryLight: isDark ? 'rgba(29, 78, 216, 0.2)' : 'rgba(29, 78, 216, 0.1)',
  };

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
        if (localStorage.getItem("name")) setName(localStorage.getItem("name") || "");
        if (localStorage.getItem("hospitalNo")) setHospitalNo(localStorage.getItem("hospitalNo") || "");
        if (localStorage.getItem("testStartTime")) setTestStartTime(localStorage.getItem("testStartTime") || "");
        if (localStorage.getItem("sleepTime")) setSleepTime(localStorage.getItem("sleepTime") || "");
        if (localStorage.getItem("wakeTime")) setWakeTime(localStorage.getItem("wakeTime") || "");
        if (localStorage.getItem("testType")) setTestType(localStorage.getItem("testType") || "Holter");
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

    setTestEnded(minutesDifference >= testDuration * 60);
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
      Alert.alert("Error", "Please fill out the activity and symptom fields.");
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
    <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Patient Details Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Patient Information</Text>
          <View style={styles.row}>
            <View style={styles.flexInput}>
              <Text style={[styles.label, { color: theme.subText }]}>Patient Name</Text>
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={theme.subText}
                style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={name}
                onChangeText={setName}
                editable={!testEnded}
              />
            </View>
            <View style={styles.flexInput}>
              <Text style={[styles.label, { color: theme.subText }]}>Hospital ID</Text>
              <TextInput
                placeholder="Hospital ID"
                placeholderTextColor={theme.subText}
                style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={hospitalNo}
                onChangeText={setHospitalNo}
                editable={!testEnded}
              />
            </View>
          </View>

          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={styles.flexInput}>
              <Text style={[styles.label, { color: theme.subText }]}>Test Start Time</Text>
              <input
                type="datetime-local"
                style={{
                  width: "100%",
                  backgroundColor: isDark ? "#2A2A2A" : "#F8FAFC",
                  color: isDark ? "#E2E8F0" : "#1E293B",
                  border: `1px solid ${isDark ? "#2D2D2D" : "#E2E8F0"}`,
                  borderRadius: "12px",
                  padding: "12px",
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

            <View style={styles.flexInput}>
              <Text style={[styles.label, { color: theme.subText }]}>Duration</Text>
              <select
                style={{
                  width: "100%",
                  backgroundColor: isDark ? "#2A2A2A" : "#F8FAFC",
                  color: isDark ? "#E2E8F0" : "#1E293B",
                  border: `1px solid ${isDark ? "#2D2D2D" : "#E2E8F0"}`,
                  borderRadius: "12px",
                  padding: "12px",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={testDuration}
                onChange={(e: any) => setTestDuration(parseInt(e.target.value))}
                disabled={testEnded}
              >
                <option value={24}>24 Hours</option>
                <option value={48}>48 Hours</option>
                <option value={168}>7 Days (168 Hours)</option>
              </select>
            </View>
          </View>

          {testType === "ABP" && (
            <View style={[styles.row, { marginTop: 12 }]}>
              <View style={styles.flexInput}>
                <Text style={[styles.label, { color: theme.subText }]}>Sleep Time</Text>
                <input
                  type="time"
                  style={{
                    width: "100%",
                    backgroundColor: isDark ? "#2A2A2A" : "#F8FAFC",
                    color: isDark ? "#E2E8F0" : "#1E293B",
                    border: `1px solid ${isDark ? "#2D2D2D" : "#E2E8F0"}`,
                    borderRadius: "12px",
                    padding: "12px",
                    fontSize: "14px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  value={sleepTime}
                  onChange={(e: any) => setSleepTime(e.target.value)}
                />
              </View>
              <View style={styles.flexInput}>
                <Text style={[styles.label, { color: theme.subText }]}>Wake Time</Text>
                <input
                  type="time"
                  style={{
                    width: "100%",
                    backgroundColor: isDark ? "#2A2A2A" : "#F8FAFC",
                    color: isDark ? "#E2E8F0" : "#1E293B",
                    border: `1px solid ${isDark ? "#2D2D2D" : "#E2E8F0"}`,
                    borderRadius: "12px",
                    padding: "12px",
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
            <View style={[styles.banner, testEnded ? styles.bannerEnded : styles.bannerActive]}>
              <Ionicons
                name={testEnded ? "alert-circle-outline" : "time-outline"}
                size={18}
                color={testEnded ? "#EF4444" : "#1D4ED8"}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.bannerText, { color: testEnded ? "#EF4444" : "#1D4ED8" }]}>
                {testEnded ? "Test has ended. Entries disabled." : `Test ends by: ${calculateTestEndTime(testStartTime)}`}
              </Text>
            </View>
          )}
        </View>

        {/* Symptoms Entry Section */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Symptoms & Activity Log</Text>
            <TouchableOpacity
              style={[styles.optionsButton, { backgroundColor: theme.primaryLight }]}
              onPress={() => setMenuVisible(!menuVisible)}
            >
              <Ionicons name="settings-outline" size={16} color={theme.primary} />
              <Text style={[styles.optionsButtonText, { color: theme.primary }]}>Options</Text>
            </TouchableOpacity>
          </View>

          {rows.map((row, index) => (
            <View key={index} style={[styles.entrySubCard, { backgroundColor: isDark ? '#181818' : '#F1F5F9' }]}>
              <View style={styles.row}>
                <View style={styles.flexInput}>
                  <Text style={[styles.subLabel, { color: theme.subText }]}>Activity</Text>
                  <TextInput
                    placeholder="What are you doing?"
                    placeholderTextColor={theme.subText}
                    style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={row.action}
                    multiline
                    onChangeText={(text) => {
                      const updatedRows = [...rows];
                      updatedRows[index].action = text;
                      setRows(updatedRows);
                    }}
                    editable={!testEnded}
                  />
                </View>
                <View style={styles.flexInput}>
                  <Text style={[styles.subLabel, { color: theme.subText }]}>Symptom</Text>
                  <TextInput
                    placeholder="What are you feeling?"
                    placeholderTextColor={theme.subText}
                    style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={row.symptom}
                    multiline
                    onChangeText={(text) => {
                      const updatedRows = [...rows];
                      updatedRows[index].symptom = text;
                      setRows(updatedRows);
                    }}
                    editable={!testEnded}
                  />
                </View>
              </View>

              {showComments && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.subLabel, { color: theme.subText }]}>Comment</Text>
                  <TextInput
                    placeholder="Add a comment"
                    placeholderTextColor={theme.subText}
                    style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={row.comment}
                    multiline
                    onChangeText={(text) => {
                      const updatedRows = [...rows];
                      updatedRows[index].comment = text;
                      setRows(updatedRows);
                    }}
                    editable={!testEnded}
                  />
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }, testEnded && { opacity: 0.5 }]}
            onPress={saveData}
            disabled={testEnded}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.submitButtonText}>Submit Entry</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Options Menu Modal Popup */}
      {menuVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.menuCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.menuHeader, { color: theme.text }]}>Configuration Menu</Text>
            
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowComments(!showComments);
                setMenuVisible(false);
              }}
            >
              <Ionicons name="chatbox-outline" size={18} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                {showComments ? "Hide Comments Field" : "Add Comments Field"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setTestType(testType === "Holter" ? "ABP" : "Holter");
                setMenuVisible(false);
              }}
            >
              <Ionicons name="swap-horizontal-outline" size={18} color={theme.primary} />
              <Text style={[styles.menuItemText, { color: theme.text }]}>
                Switch to {testType === "Holter" ? "ABP" : "Holter"} Mode
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuVisible(false)}>
              <Ionicons name="close-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: "#EF4444" }]}>Close Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Password Verification Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Passcode Verification</Text>
            <Text style={[styles.modalSub, { color: theme.subText }]}>Enter passcode to change test parameters.</Text>
            
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 16 }]}
              placeholder="Enter passcode"
              placeholderTextColor={theme.subText}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: isDark ? '#333' : '#E2E8F0', marginRight: 8 }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: theme.primary, marginLeft: 8 }]}
                onPress={handlePasswordSubmit}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Confirm</Text>
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
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flexInput: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  entrySubCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  bannerActive: {
    backgroundColor: "rgba(29, 78, 216, 0.1)",
  },
  bannerEnded: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  optionsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  menuCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 16,
    padding: 16,
  },
  menuHeader: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
