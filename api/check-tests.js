export default async function handler(req, res) {
  console.log("--- Check-tests cron job started ---");
  
  try {
    const projectId = "mednote-9e0d4";
    const dbUrl = `https://${projectId}-default-rtdb.firebaseio.com/entries.json`;
    
    console.log(`Fetching database from: ${dbUrl}`);
    const response = await fetch(dbUrl);

    if (!response.ok) {
      console.error(`Firebase error status: ${response.status}`);
      throw new Error(`Firebase HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    if (!data) {
      console.log("Database returned empty or null data.");
      return res.status(200).json({ message: "No entries found in database." });
    }

    const now = new Date();
    console.log(`Current Server Time: ${now.toISOString()}`);
    
    const alertsSent = [];

    for (const patientKey of Object.keys(data)) {
      const patientData = data[patientKey];
      console.log(`Checking patient: ${patientKey}`);

      for (const timestamp of Object.keys(patientData)) {
        if (timestamp === "TestDetails" || timestamp === "key") continue;

        const entryArray = patientData[timestamp];
        if (!entryArray || !entryArray["0"]) continue;

        const entry = entryArray["0"];
        if (!entry.TestStartTime || !entry.TestEndTime) continue;

        const endTime = new Date(entry.TestEndTime.replace(" ", "T"));
        const diffHours = (endTime - now) / (1000 * 60 * 60);

        console.log(`-> Patient ${patientKey} | Ends at: ${entry.TestEndTime} | Hours remaining: ${diffHours.toFixed(2)}`);

        // Check window (between 1.75 and 2.0 hours remaining)
        if (diffHours >= 1.75 && diffHours <= 2.0) {
          console.log(`Target window hit for ${patientKey}! Sending Telegram alert...`);
          await sendTelegramAlert(patientKey, entry.TestEndTime);
          alertsSent.push(patientKey);
        }
      }
    }

    console.log(`Job finished successfully. Alerts sent: ${alertsSent.length}`);
    return res.status(200).json({ success: true, alertsSent });
  } catch (error) {
    console.error("Cron Error Caught:", error.message);
    return res.status(500).json({ error: error.message });
  }
}

async function sendTelegramAlert(patientName, endTime) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error("Telegram Error: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables!");
    return;
  }

  const message = `⚠️ *MedNote Test Alert*\n\nPatient: *${patientName}*\nTest End Time: ${endTime}\n\nThis test ends in approximately 2 hours.`;

  const tgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  const tgResult = await tgResponse.json();
  if (!tgResult.ok) {
    console.error("Telegram API Failed:", tgResult);
  } else {
    console.log("Telegram API Success:", tgResult);
  }
}
