import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const directory = fileURLToPath(new URL("../", import.meta.url));
const command = promisify(execFile);
const selected = process.argv.find(value => value.startsWith("--platform="))?.split("=")[1] ?? "all";
if (!["all", "web", "android", "ios"].includes(selected)) throw new Error("Choose --platform=web, android, ios or all.");
const localUsb = process.argv.includes("--local-usb");
if (localUsb && selected !== "android") throw new Error("Local USB library testing is available for Android only.");
let missing = 0;
function report(label, ready, detail = "") {
  console.log(`${ready ? "READY" : "PENDING"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ready) missing++;
}
async function exists(file) { try { await access(file, constants.R_OK); return true; } catch { return false; } }
async function runs(binary, args) { try { await command(binary, args, { windowsHide: true, timeout: 15000 }); return true; } catch { return false; } }

report("Node.js 22+", Number(process.versions.node.split(".")[0]) >= 22);
const packageJson = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
const versions = ["@capacitor/core", "@capacitor/android", "@capacitor/ios"].map(name => packageJson.dependencies[name]);
report("Matching Capacitor platform versions", new Set(versions).size === 1);
report("Built shared screens", await exists(path.join(directory, "dist/index.html")), "run npm run build if missing");

const environment = { ...loadEnv("development", directory, "VITE_"), ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("VITE_"))) };
let origin;
try {
  const url = new URL(environment.VITE_API_ORIGIN || "http://localhost:3000");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid origin");
  origin = url.origin;
  report("Public API origin", true, url.protocol === "https:" ? "HTTPS configured" : "localhost development only");
  if (localUsb) report("Local USB development origin", ["http://localhost:3000", "http://127.0.0.1:3000"].includes(origin),
    "use adb reverse tcp:3000 tcp:3000; native USB sign-in is enabled only in this explicit Android debug build");
  else if (selected !== "web") report("HTTPS API origin for native distribution", url.protocol === "https:", "configure VITE_API_ORIGIN for native devices; do not place secrets in VITE_* settings");
} catch { report("Public API origin", false, "expected an HTTPS origin or localhost, without credentials/path"); }
if (origin) {
  let available = false;
  try {
    const response = await fetch(new URL("/api/v1/bootstrap", origin), { credentials: "omit", signal: AbortSignal.timeout(40000) });
    const body = await response.json();
    available = response.ok && body.success === true && body.data?.apiVersion === 1;
  } catch { /* Do not print connection settings or provider errors. */ }
  report("Shared backend bootstrap", available, "start/deploy the backend with the versioned APIs");
}

if (["all", "android"].includes(selected)) {
  report("Android project", await exists(path.join(directory, "android/app/build.gradle")));
  const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(os.homedir(), "AppData/Local/Android/Sdk");
  const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java") : "java";
  let javaReady = false;
  try {
    const version = await command(java, ["-version"], { windowsHide: true, timeout: 15000 });
    const major = Number((version.stderr + version.stdout).match(/version\s+"(\d+)/)?.[1]);
    // The project's Gradle 8.14 wrapper supports Java through 24; newer Studio
    // releases can bundle Java 25, so point Gradle/JAVA_HOME to Java 21 instead.
    javaReady = major >= 21 && major <= 24;
  } catch { /* Missing Java is a setup requirement, not an app failure. */ }
  report("Java 21–24 for Gradle 8.14 builds", javaReady, "use Java 21 in JAVA_HOME and Android Studio's Gradle JDK setting");
  report("Android SDK API 36", await exists(path.join(sdk, "platforms/android-36/android.jar")), "install with Android Studio SDK Manager");
  report("Android platform tools", await runs(path.join(sdk, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb"), ["version"]));
  report("Gradle wrapper", await exists(path.join(directory, "android/gradle/wrapper/gradle-wrapper.jar")));
}
if (["all", "ios"].includes(selected)) {
  report("iOS project", await exists(path.join(directory, "ios/App/App.xcodeproj/project.pbxproj")));
  const mac = process.platform === "darwin";
  let xcodeReady = false;
  if (mac) {
    try {
      const version = await command("xcodebuild", ["-version"], { windowsHide: true, timeout: 15000 });
      xcodeReady = Number(version.stdout.match(/Xcode\s+(\d+)/)?.[1]) >= 26;
    } catch { /* Xcode setup is still required. */ }
  }
  report("Local macOS/Xcode 26+ build environment", xcodeReady, mac ? "configure Xcode and command-line tools" : "use a Mac or a configured Mac build service");
}
console.log("This check does not verify signing, native login, full features or store approval. Existing database records are never changed.");
process.exitCode = missing ? 1 : 0;
