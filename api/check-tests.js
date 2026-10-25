import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

export default async function handler(req, res) {
  try {
    const db = getDatabase();
    const snapshot = await get(ref(db, "entries"));
    const data = snapshot.val();
    
    if (!data) return res.status(200).json({ message: "No entries found." });

    const now = new Date();
    const alertsSent = [];

    for (const patientKey of Object.keys(data)) {
      const patientData = data[patientKey];

      for (const timestamp of Object.keys(patientData)) {
        if (timestamp === "TestDetails" || timestamp === "key") continue;

        const entryArray = patientData[timestamp];
        if (!entryArray || !entryArray["0"]) continue;

        const entry = entryArray["0"];
        if (!entry.TestStartTime || !entry.TestEndTime) continue;

        const endTime = new Date(entry.TestEndTime.replace(" ", "T"));
        const diffHours = (endTime - now) / (1000 * 60 * 60);

        // Send alert if the test ends in ~2 hours (between 1.75 and 2 hours remaining)
        if (diffHours >= 1.75 && diffHours <= 2.0) {
          await sendTelegramAlert(patientKey, entry.TestEndTime);
          alertsSent.push(patientKey);
        }
      }
    }

    return res.status(200).json({ success: true, alertsSent });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}

async function sendTelegramAlert(patientName, endTime) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const message = `⚠️ *MedNote Test Alert*\n\nPatient: *${patientName}*\nTest End Time: ${endTime}\n\nThis test ends in approximately 2 hours.`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}
