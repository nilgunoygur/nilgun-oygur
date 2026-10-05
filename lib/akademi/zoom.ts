/** Digits of a 9–11 digit Zoom meeting number; empty if it is not one. */
export function zoomMeetingId(value: string) {
  const digits = value.replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? digits : "";
}

/** One student's join links; only the app links carry the passcode and name. */
export function zoomLinks(meetingId: string, passcode: string, name: string) {
  const query = `confno=${meetingId}${passcode && `&pwd=${encodeURIComponent(passcode)}`}&uname=${encodeURIComponent(name)}`;
  return { desktop: `zoommtg://zoom.us/join?${query}`, mobile: `zoomus://zoom.us/join?${query}`, web: `https://zoom.us/j/${meetingId}`, passcode };
}
