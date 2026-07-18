import { HttpError } from "./http.js";

export function requirePartyId(value, fieldName = "partyId") {
  if (typeof value !== "string" || !/^[^\s:]+::[A-Za-z0-9]+$/.test(value)) {
    throw new HttpError(400, `${fieldName} must be a complete Canton party id`);
  }
  return value;
}

export function requireLedgerId(value, fieldName = "updateId") {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{16,256}$/.test(value)) {
    throw new HttpError(400, `${fieldName} has an invalid format`);
  }
  return value;
}

export function cleanText(value, { fieldName = "text", maxLength = 2000, required = false } = {}) {
  const text = typeof value === "string" ? value.trim() : "";
  if (required && !text) throw new HttpError(400, `${fieldName} is required`);
  if (text.length > maxLength) throw new HttpError(400, `${fieldName} is too long`);
  return text;
}
