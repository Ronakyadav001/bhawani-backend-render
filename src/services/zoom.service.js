const { env } = require("../config/env");

function hasZoomCredentials() {
  return Boolean(env.ZOOM_ACCOUNT_ID && env.ZOOM_CLIENT_ID && env.ZOOM_CLIENT_SECRET);
}

async function getZoomAccessToken() {
  if (!hasZoomCredentials()) return null;

  const credentials = Buffer.from(`${env.ZOOM_CLIENT_ID}:${env.ZOOM_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${env.ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`
      }
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom token request failed: ${body}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createZoomMeeting({ title, startTime, durationMin }) {
  const token = await getZoomAccessToken();

  if (!token) {
    return {
      zoomMeetingId: null,
      zoomStartUrl: null,
      zoomJoinUrl: null,
      liveLink: null,
      provider: "ZOOM_NOT_CONFIGURED"
    };
  }

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      topic: title,
      type: 2,
      start_time: startTime.toISOString(),
      duration: durationMin,
      timezone: "Asia/Kolkata",
      settings: {
        join_before_host: false,
        waiting_room: true,
        approval_type: 2,
        auto_recording: "none"
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Zoom meeting creation failed: ${body}`);
  }

  const meeting = await response.json();
  return {
    zoomMeetingId: String(meeting.id),
    zoomStartUrl: meeting.start_url,
    zoomJoinUrl: meeting.join_url,
    liveLink: meeting.join_url,
    provider: "ZOOM"
  };
}

module.exports = { createZoomMeeting, hasZoomCredentials };
