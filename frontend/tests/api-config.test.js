import { test } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  resolveApiBaseUrl,
  validateProductionEnvironment,
} from "../src/api/config.js";

test("a backend origin and a versioned base URL produce the same auth request URL", () => {
  for (const value of [
    "https://api.example.com",
    "https://api.example.com/",
    "https://api.example.com/api/v1",
    " https://api.example.com/api/v1/ ",
  ]) {
    const client = axios.create({
      baseURL: resolveApiBaseUrl(value, { production: true }),
    });
    assert.equal(
      client.getUri({ url: "/auth/login" }),
      "https://api.example.com/api/v1/auth/login",
    );
  }
});

test("local development retains its default API URL", () => {
  assert.equal(resolveApiBaseUrl(), "http://localhost:8000/api/v1");
  assert.equal(
    resolveApiBaseUrl("http://127.0.0.1:8000/"),
    "http://127.0.0.1:8000/api/v1",
  );
});

test("production rejects missing, insecure and loopback backend URLs", () => {
  for (const value of [
    undefined,
    "",
    "  ",
    "not-a-url",
    "http://api.example.com",
    "https://localhost:8000",
    "https://127.0.0.1:8000",
    "https://[::1]",
    "https://0.0.0.0",
  ]) {
    assert.throws(
      () => resolveApiBaseUrl(value, { production: true }),
      /VITE_API_BASE_URL/,
    );
  }
});

test("ambiguous paths and credentials cannot become an API base URL", () => {
  for (const value of [
    "https://api.example.com/api/v1/api/v1",
    "https://api.example.com/auth/login",
    "https://user:password@api.example.com",
    "https://api.example.com/?token=example",
    "https://api.example.com/#/api/v1",
    "ftp://api.example.com",
  ]) {
    assert.throws(() => resolveApiBaseUrl(value), /VITE_API_BASE_URL/);
  }
});

test("production configuration requires a real API and disables Demo Mode", () => {
  const env = {
    VITE_API_BASE_URL: "https://api.example.com/api/v1",
    VITE_DEMO_MODE: "false",
  };
  assert.equal(validateProductionEnvironment(env), env.VITE_API_BASE_URL);
  assert.throws(() => validateProductionEnvironment({}), /VITE_API_BASE_URL/);
  assert.throws(
    () => validateProductionEnvironment({ ...env, VITE_DEMO_MODE: "true" }),
    /VITE_DEMO_MODE/,
  );
});
