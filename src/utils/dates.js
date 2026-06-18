function addDuration(startDate, duration) {
  const end = new Date(startDate);
  if (duration === "MONTHLY") end.setMonth(end.getMonth() + 1);
  if (duration === "QUARTERLY") end.setMonth(end.getMonth() + 3);
  if (duration === "YEARLY") end.setFullYear(end.getFullYear() + 1);
  return end;
}

function dayRange(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

module.exports = { addDuration, dayRange };
