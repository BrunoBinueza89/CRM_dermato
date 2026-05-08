function sendError(res, status, message, details) {
  const payload = { message };
  if (details !== undefined) payload.details = details;
  return res.status(status).json(payload);
}

module.exports = { sendError };

