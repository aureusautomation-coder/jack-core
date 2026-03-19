function sanitizeError(error, context = "operation") {
  const message = error?.message || "";

  if (message.toLowerCase().includes("token") || message.toLowerCase().includes("unauthorized")) {
    return "Authentication failed. Please try again.";
  }

  if (message.toLowerCase().includes("validation") || message.toLowerCase().includes("invalid")) {
    return "Invalid request parameters.";
  }

  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("econnaborted")) {
    return "Request timed out. Please try again.";
  }

  if (message.toLowerCase().includes("econnrefused") || message.toLowerCase().includes("network")) {
    return "Service unavailable. Please try again later.";
  }

  if (message.toLowerCase().includes("booking") && message.toLowerCase().includes("not found")) {
    return "Booking not found. Please verify the booking ID.";
  }

  return `Failed to ${context}. Please try again later.`;
}

module.exports = { sanitizeError };
