#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

function usage() {
  console.error(
    [
      "Usage:",
      "  node register-nanaco-gift.mjs <giftTextFile> <nanacoNumber> [--encoding <name>]",
      "",
      "Environment variables:",
      "  NANACO_PASSWORD     Password for nanaco mobile login",
      "  NANACO_CARD_NUMBER  7-digit card number for nanaco card login",
      "",
      "Notes:",
      "  - Set either NANACO_PASSWORD or NANACO_CARD_NUMBER (not both).",
      "  - NANACO_NUMBER is passed as the second argument.",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const args = {
    encoding: null,
  };

  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--encoding") {
      i += 1;
      args.encoding = argv[i] ?? null;
    } else if (a.startsWith("-")) {
      throw new Error(`Unknown option: ${a}`);
    } else {
      positionals.push(a);
    }
  }
  if (positionals.length < 2) {
    throw new Error("Missing required arguments.");

  }

  args.giftTextFile = path.resolve(positionals[0]);
  args.nanacoNumber = positionals[1];
  return args;
}

function validateNanacoNumber(value) {
  if (!/^\d{16}$/.test(value)) {
    throw new Error("Nanaco number must be exactly 16 digits.");
  }
}

function validateCredentials() {
  const cardNumber = process.env.NANACO_CARD_NUMBER;
  const password = process.env.NANACO_PASSWORD;

  if ((cardNumber && password) || (!cardNumber && !password)) {
    throw new Error("Set exactly one of NANACO_CARD_NUMBER or NANACO_PASSWORD.");
  }

  if (cardNumber && !/^\d{7}$/.test(cardNumber)) {
    throw new Error("NANACO_CARD_NUMBER must be exactly 7 digits.");
  }

  return { cardNumber, password };
}

function detectEncoding(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return "utf-16le";
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return "utf-16be";
  }
  return "utf-8";
}

function decodeText(bytes, encodingArg) {
  const encoding = (encodingArg ?? detectEncoding(bytes)).toLowerCase();
  if (encoding === "utf8") {
    return new TextDecoder("utf-8").decode(bytes);
  }
  if (encoding === "utf-8") {
    return new TextDecoder("utf-8").decode(bytes);
  }
  if (encoding === "unicode" || encoding === "utf-16le") {
    return new TextDecoder("utf-16le").decode(bytes);
  }
  if (encoding === "bigendianunicode" || encoding === "utf-16be") {
    return new TextDecoder("utf-16be").decode(bytes);
  }
  throw new Error(`Unsupported encoding: ${encodingArg}`);
}

function extractUrls(text) {
  const matches = text.match(/https:\/\/www\.nanaco-net\.jp\/pc\/emServlet\?gid=[a-zA-Z0-9]{16}/g);
  return matches ?? [];
}

function maskGid(registerUrl) {
  const m = registerUrl.match(/[?&]gid=([a-zA-Z0-9]{16})/);
  if (!m) {
    return "unknown";
  }
  return `${m[1].slice(0, 4)}************`;
}

async function launchChrome() {
  return chromium.launch({ channel: "chrome", headless: false });
}

async function registerOne(page, registerUrl, credentials, nanacoNumber) {
  console.log(`Process: ${maskGid(registerUrl)}`);

  await page.goto(registerUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  if (credentials.cardNumber) {
    await page.locator("#nanacoNumber02").fill(nanacoNumber);
    await page.locator("#cardNumber").fill(credentials.cardNumber);
    await page.locator("#loginPass02").click();
  } else {
    await page.locator("#nanacoNumber01").fill(nanacoNumber);
    await page.locator("#pass").fill(credentials.password);
    await page.locator("#loginPass01").click();
  }

  const menuLink = page.getByRole("link", { name: "nanacoギフト登録" }).first();
  await menuLink.waitFor({ state: "visible", timeout: 10000 });
  await menuLink.click();

  const openGiftInput = page.locator('input[src*="/member/image/gift100/btn_400.gif"]').first();
  await openGiftInput.waitFor({ state: "visible", timeout: 10000 });

  const [popup] = await Promise.all([
    page.waitForEvent("popup", { timeout: 10000 }),
    openGiftInput.click(),
  ]);

  await popup.waitForLoadState("domcontentloaded");
  await popup.locator("#submit-button").click();

  const confirmInput = popup.locator('input[src*="/img/btn_register_b.gif"]').first();
  try {
    await confirmInput.waitFor({ state: "visible", timeout: 3000 });
    await confirmInput.click();
    await popup.waitForTimeout(1000);
  } catch (err) {
    const bodyText = (await popup.locator("body").innerText()).replace(/\s+/g, " ").trim();
    const normalizedBodyText = bodyText
      .replace(/[\u3000\s]+/g, " ")
      .replace(/[。．]/g, "")
      .trim();
    const alreadyRegisteredPattern = /登録済|既に登録|すでに登録|ご利用済|既に利用/;
    if (alreadyRegisteredPattern.test(normalizedBodyText)) {
      console.log(`Already registered: ${maskGid(registerUrl)}`);
      await popup.close();
      return;
    }

    const message = String(err?.message ?? err);
    const isTimeout = err?.name === "TimeoutError" || /Timeout/i.test(message);
    if (isTimeout) {
      throw new Error(
        `Confirm button not found and gift is not marked as already registered: ${maskGid(registerUrl)}`,
      );
    }
    throw err;
  }

  await popup.close();
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String(err?.message ?? err));
    usage();
    process.exitCode = 1;
    return;
  }

  validateNanacoNumber(parsed.nanacoNumber);
  const credentials = validateCredentials();

  if (!fs.existsSync(parsed.giftTextFile)) {
    throw new Error(`Gift text file not found: ${parsed.giftTextFile}`);
  }

  const bytes = fs.readFileSync(parsed.giftTextFile);
  const text = decodeText(bytes, parsed.encoding);
  const urls = extractUrls(text);

  if (urls.length === 0) {
    throw new Error("No valid gift URLs / gift IDs found.");
  }

  const browser = await launchChrome();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    for (const url of urls) {
      await registerOne(page, url, credentials, parsed.nanacoNumber);
    }
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err?.stack ?? String(err));
  process.exitCode = 1;
});
