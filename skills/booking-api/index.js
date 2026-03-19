import { request } from "undici";

const BASE_URL = "http://127.0.0.1:3000";

async function postJson(path, body) {
  const url = `${BASE_URL}${path}`;
  const res = await request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.body.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      success: false,
      error: "Non-JSON response from middleware",
      status: res.statusCode,
      raw: text.slice(0, 500),
    };
  }

  if (res.statusCode < 200 || res.statusCode >= 300) {
    return {
      success: false,
      error: "HTTP error from middleware",
      status: res.statusCode,
      data: json,
    };
  }
  return json;
}

// OpenClaw will call exported handlers by tool name
export async function availability(input) {
  // input: { service_id, date }
  return await postJson("/api/availability", input);
}

export async function booking(input) {
  // input: { name, phone, email, service_id, provider_id, date, time }
  return await postJson("/api/booking", input);
}

export async function reschedule(input) {
  // input: { booking_id, booking_hash, new_date, new_time }
  return await postJson("/api/reschedule", input);
}
