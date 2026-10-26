import Foundation
import Security
import Capacitor

@objc(SecureAuthStoragePlugin)
public class SecureAuthStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureAuthStoragePlugin"
    public let jsName = "SecureAuthStorage"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise)
    ]
    private let service = "org.jooust.luoheritage.native-auth.v1"
    private let account = "native-auth-state"

    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: service,
         kSecAttrAccount as String: account,
         kSecAttrSynchronizable as String: false]
    }

    // Keychain items can outlive an uninstall. An app-container marker prevents
    // an installation from silently inheriting a previous installation's login.
    private func checkInstallation() throws {
        let directory = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var marker = directory.appendingPathComponent("native-auth-install-v1")
        if !FileManager.default.fileExists(atPath: marker.path) {
            let status = SecItemDelete(query as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else { throw StorageError.unavailable }
            try Data([1]).write(to: marker, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try marker.setResourceValues(values)
        }
    }

    private enum StorageError: Error { case unavailable }

    @objc func read(_ call: CAPPluginCall) {
        do {
            try checkInstallation()
            var request = query
            request[kSecReturnData as String] = true
            request[kSecMatchLimit as String] = kSecMatchLimitOne
            var result: CFTypeRef?
            let status = SecItemCopyMatching(request as CFDictionary, &result)
            if status == errSecItemNotFound { call.resolve(["value": NSNull()]); return }
            guard status == errSecSuccess, let data = result as? Data,
                  let value = String(data: data, encoding: .utf8) else { throw StorageError.unavailable }
            call.resolve(["value": value])
        } catch {
            call.reject("Protected login storage is unavailable. Unlock your phone and try again.")
        }
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), let data = value.data(using: .utf8), data.count <= 16384 else {
            call.reject("Invalid protected login state."); return
        }
        do {
            try checkInstallation()
            let attributes: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            ]
            var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            if status == errSecItemNotFound {
                status = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
            }
            guard status == errSecSuccess else { throw StorageError.unavailable }
            call.resolve()
        } catch {
            call.reject("Protected login storage is unavailable. Unlock your phone and try again.")
        }
    }
}
