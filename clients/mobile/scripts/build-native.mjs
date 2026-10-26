import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const directory = fileURLToPath(new URL("../", import.meta.url));
const platform = process.argv[2];
const mode = process.argv[3] || "debug";
const localUsb = process.argv.includes("--local-usb");
if (!["android", "ios"].includes(platform) || !["debug", "release"].includes(mode)) throw new Error("Use build-native.mjs android|ios debug|release.");
if (localUsb && (platform !== "android" || mode !== "debug")) throw new Error("Local USB testing is restricted to Android debug builds.");
if (platform === "ios" && process.platform !== "darwin") throw new Error("iOS compilation needs a Mac with Xcode. Use the prepared macOS workflow or a Mac.");
if (mode === "release") throw new Error("Store release is gated: confirm permanent app identifiers, signing ownership and full device acceptance before enabling a signed release pipeline. Debug Android/simulator builds are available now.");

function run(command, args, cwd = directory) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: process.env, stdio: "inherit", windowsHide: true });
    child.once("error", reject);
    child.once("exit", code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} failed with exit code ${code}.`)));
  });
}
// Compile shared screens first, then copy that exact bundle to this platform.
await run(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"]);
await run(process.execPath, ["node_modules/vite/bin/vite.js", "build"]);
await run(process.execPath, ["scripts/doctor.mjs", `--platform=${platform}`, ...(localUsb ? ["--local-usb"] : [])]);
await run(process.execPath, ["node_modules/@capacitor/cli/bin/capacitor", "sync", platform]);
if (platform === "android") {
  const nativeDirectory = path.join(directory, "android");
  if (process.platform === "win32") {
    // Paths are supplied as arguments, never composed from credentials.
    await run("cmd.exe", ["/d", "/c", "gradlew.bat", "--no-daemon", "--max-workers=2", ...(localUsb ? ["-PluoUsbAuth=true"] : []), ":app:assembleDebug", ":app:lintDebug"], nativeDirectory);
  } else await run("sh", ["gradlew", "--no-daemon", "--max-workers=2", ...(localUsb ? ["-PluoUsbAuth=true"] : []), ":app:assembleDebug", ":app:lintDebug"], nativeDirectory);
  const apk = path.join(nativeDirectory, "app/build/outputs/apk/debug/app-debug.apk");
  await access(apk);
  console.log(`Development APK: ${apk}`);
} else {
  await run("xcodebuild", ["-project", "ios/App/App.xcodeproj", "-scheme", "App", "-configuration", "Debug",
    "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator", "-derivedDataPath", "ios/DerivedData",
    "CODE_SIGNING_ALLOWED=NO", "build"]);
  await access(path.join(directory, "ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app"));
  console.log("iOS simulator app: ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app");
}
const metadata = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
console.log(`Built mobile client ${metadata.version}. Native build success still requires installation/device acceptance.`);
