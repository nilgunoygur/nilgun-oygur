/** A Zoom meeting number without its spaces and dashes; empty unless it is 9 to 11 digits. */
export function zoomMeetingId(value: string) {
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? digits : "";
}

/** One student's ways into a meeting. The app links carry the passcode and the student's name; the web link asks for both. */
export function zoomLinks(meetingId: string, passcode: string, name: string) {
  const query = new URLSearchParams({ confno: meetingId, ...(passcode && { pwd: passcode }), uname: name }).toString().replaceAll("+", "%20");
  return { desktop: `zoommtg://zoom.us/join?${query}`, mobile: `zoomus://zoom.us/join?${query}`, web: `https://zoom.us/j/${meetingId}` };
}
