package ai.kidsit.app;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Reads the Google Play install referrer string (the `referrer` parameter of
 * the Play link the user tapped). The JS side (src/installReferrer.js) keeps
 * only the utm_* values and reads this once per install.
 */
@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {

    @PluginMethod
    public void getReferrer(final PluginCall call) {
        final InstallReferrerClient client;
        try {
            client = InstallReferrerClient.newBuilder(getContext()).build();
        } catch (Exception e) {
            call.reject("install referrer unavailable", e);
            return;
        }
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int responseCode) {
                    try {
                        if (responseCode != InstallReferrerClient.InstallReferrerResponse.OK) {
                            call.reject("install referrer response " + responseCode);
                            return;
                        }
                        ReferrerDetails details = client.getInstallReferrer();
                        String referrer = details != null ? details.getInstallReferrer() : null;
                        JSObject ret = new JSObject();
                        ret.put("referrer", referrer != null ? referrer : "");
                        call.resolve(ret);
                    } catch (Exception e) {
                        call.reject("install referrer read failed", e);
                    } finally {
                        try {
                            client.endConnection();
                        } catch (Exception ignored) {
                            // Already disconnected.
                        }
                    }
                }

                @Override
                public void onInstallReferrerServiceDisconnected() {
                    // The JS caller times out and retries on the next launch.
                }
            });
        } catch (Exception e) {
            call.reject("install referrer connection failed", e);
        }
    }
}
