export default async function handler(req, res) {
  try {
    const projectId = "mednote-9e0d4";
    const dbUrl = `https://${projectId}-default-rtdb.firebaseio.com/entries.json`;
    
    const response = await fetch(dbUrl);
    if (!response.ok) {
      throw new Error(`Firebase HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data) {
      return res.status(200).json({ success: true, message: "No entries found." });
    }

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

        // Triggers if test is 2 hours or less remaining, but still ongoing (diffHours > 0)
        if (diffHours > 0 && diffHours <= 2.0) {
          const hoursLeft = Math.floor(diffHours);
          const minutesLeft = Math.floor((diffHours - hoursLeft) * 60);
          const timeLeftStr = `${hoursLeft} hours and ${minutesLeft} minutes`;

          await sendTelegramAlert(patientKey, entry.TestEndTime, timeLeftStr);
          alertsSent.push(patientKey);
        }
      }
    }

    return res.status(200).json({ success: true, alertsSent });
  } catch (error) {
    console.error("Cron Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function sendTelegramAlert(patientName, endTime, timeLeft) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const message = `⚠️ *MedNote Test Alert*\n\nPatient: *${patientName}*\nTest End Time: ${endTime}\n⏳ *Time Remaining:* ${timeLeft}`;

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
