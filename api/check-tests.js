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

        // Triggers if test is 3 hours or less remaining, but still ongoing
        if (diffHours > 0 && diffHours <= 3.0) {
          const totalMinutesLeft = Math.floor(diffHours * 60);
          const hoursLeft = Math.floor(totalMinutesLeft / 60);
          const minutesLeft = totalMinutesLeft % 60;

          // Format remaining time dynamically (drops hours if 0, handles singular/plural)
          let timeLeftStr = "";
          if (hoursLeft > 0) {
            const hourWord = hoursLeft === 1 ? "1 hour" : `${hoursLeft} hours`;
            timeLeftStr = minutesLeft > 0 ? `${hourWord} and ${minutesLeft} minutes` : hourWord;
          } else {
            timeLeftStr = `${minutesLeft} minutes`;
          }

          // Format Test End Time to 12-hour format with AM/PM
          const formattedEndTime = endTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          // Clean patient name: cut out everything after the last minus sign "-"
          const cleanPatientName = patientKey.includes("-") 
            ? patientKey.substring(0, patientKey.lastIndexOf("-")).trim() 
            : patientKey;

          await sendTelegramAlert(cleanPatientName, timeLeftStr, formattedEndTime);
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

async function sendTelegramAlert(patientName, timeLeft, endTime) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  // Combined on the same line, no emojis, no extra line spacing at the top
  const message = `*MedNote Test Alert*\nPatient: *${patientName}*\n*Time Remaining:* ${timeLeft} (Ends at ${endTime})`;

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
