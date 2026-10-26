package org.jooust.luoheritage.dev;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DevelopmentConnection")
public class DevelopmentConnectionPlugin extends Plugin {
    @PluginMethod
    public void canUseUsbAuth(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", BuildConfig.DEBUG && BuildConfig.USB_AUTH_ENABLED);
        call.resolve(result);
    }
}
