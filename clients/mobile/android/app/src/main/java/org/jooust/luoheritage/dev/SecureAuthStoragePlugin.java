package org.jooust.luoheritage.dev;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureAuthStorage")
public class SecureAuthStoragePlugin extends Plugin {
    private static final String ENTRY = "native-auth-state";
    private static final String ALIAS = "luo-heritage-native-auth-v1";

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences("native-auth-encrypted", Context.MODE_PRIVATE);
    }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .setRandomizedEncryptionRequired(true).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }

    private byte[] associatedData() {
        return (getContext().getPackageName() + ":" + ENTRY + ":v1").getBytes(StandardCharsets.UTF_8);
    }

    @PluginMethod
    public synchronized void read(PluginCall call) {
        String stored = preferences().getString(ENTRY, null);
        JSObject result = new JSObject();
        if (stored == null) { result.put("value", org.json.JSONObject.NULL); call.resolve(result); return; }
        try {
            String[] parts = stored.split(":", -1);
            if (parts.length != 3 || !parts[0].equals("v1")) throw new IllegalStateException();
            byte[] iv = Base64.decode(parts[1], Base64.NO_WRAP);
            if (iv.length != 12) throw new IllegalStateException();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            cipher.updateAAD(associatedData());
            result.put("value", new String(cipher.doFinal(Base64.decode(parts[2], Base64.NO_WRAP)), StandardCharsets.UTF_8));
            call.resolve(result);
        } catch (Exception error) {
            // Corrupt or restored ciphertext must never become a plain-text
            // fallback. Clear only this app-owned entry and require new login.
            preferences().edit().remove(ENTRY).commit();
            call.reject("Protected login could not be read. Please sign in again.");
        }
    }

    @PluginMethod
    public synchronized void write(PluginCall call) {
        String value = call.getString("value");
        if (value == null || value.getBytes(StandardCharsets.UTF_8).length > 16384) {
            call.reject("Invalid protected login state."); return;
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            cipher.updateAAD(associatedData());
            String stored = "v1:" + Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":"
                + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!preferences().edit().putString(ENTRY, stored).commit()) throw new IllegalStateException();
            call.resolve();
        } catch (Exception error) {
            call.reject("Protected login storage is unavailable. Please try again.");
        }
    }

    @PluginMethod
    public synchronized void checkStorage(PluginCall call) {
        if (!BuildConfig.DEBUG) { call.reject("Unavailable in this build."); return; }
        final String scratch = "native-auth-storage-probe";
        try {
            byte[] sample = java.util.UUID.randomUUID().toString().getBytes(StandardCharsets.UTF_8);
            Cipher encrypt = Cipher.getInstance("AES/GCM/NoPadding");
            encrypt.init(Cipher.ENCRYPT_MODE, key());
            encrypt.updateAAD(associatedData());
            byte[] encrypted = encrypt.doFinal(sample);
            if (!preferences().edit().putString(scratch, Base64.encodeToString(encrypted, Base64.NO_WRAP)).commit()) throw new IllegalStateException();
            byte[] saved = Base64.decode(preferences().getString(scratch, ""), Base64.NO_WRAP);
            Cipher decrypt = Cipher.getInstance("AES/GCM/NoPadding");
            decrypt.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, encrypt.getIV()));
            decrypt.updateAAD(associatedData());
            if (!java.security.MessageDigest.isEqual(sample, decrypt.doFinal(saved))) throw new IllegalStateException();
            JSObject result = new JSObject(); result.put("ready", true); call.resolve(result);
        } catch (Exception error) {
            call.reject("Protected login storage check failed.");
        } finally {
            preferences().edit().remove(scratch).commit();
        }
    }
}
