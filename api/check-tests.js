export default async function handler(req, res) {
  try {
    // Hardcoded your project ID from app.json so it doesn't rely on process.env for Firebase
    const projectId = "mednote-9e0d4";
    
    // Fetch entries directly from Realtime Database using REST API
    const dbUrl = `https://${projectId}-default-rtdb.firebaseio.com/entries.json`;
    const response = await fetch(dbUrl);

    if (!response.ok) {
      throw new Error(`Firebase HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      return res.status(200).json({ message: "No entries found in database." });
    }

    const now = new Date();
    const alertsSent = [];

    // Iterate over patient records
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

        // Check window (between 1.75 and 2.0 hours remaining)
        if (diffHours >= 1.75 && diffHours <= 2.0) {
          await sendTelegramAlert(patientKey, entry.TestEndTime);
          alertsSent.push(patientKey);
        }
      }
    }

    return res.status(200).json({ success: true, alertsSent });
  } catch (error) {
    console.error("Cron Error:", error);
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
