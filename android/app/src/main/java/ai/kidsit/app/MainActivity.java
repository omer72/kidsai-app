package ai.kidsit.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Must come after super.onCreate: touching the window before it
        // inflates the decor with the launch (splash) theme, which drags in a
        // title bar and the splash drawable as the window background.
        super.onCreate(savedInstanceState);

        // Android 15+ lays the window out behind the system bars whether the
        // app asks for it or not, so opt in explicitly: transparent bars with
        // dark icons (every theme in the app is light-background).
        EdgeToEdge.enable(
            this,
            SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        );

        // WebView content does not get real system-bar insets through
        // env(safe-area-inset-*) on Android — Chromium only reports display
        // cutouts there — so pad the content view by the bar insets instead.
        // Behind the bars the window background (@color/appBackground) shows.
        View content = findViewById(android.R.id.content);
        // Paint the strips the padding leaves behind the transparent bars.
        // The window background there is still the launch theme's splash
        // drawable, so colour the content view itself instead of relying on it.
        content.setBackgroundColor(getResources().getColor(R.color.appBackground, getTheme()));
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
            );
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        // The launch theme paints the dark splash drawable as the window
        // background; behind the transparent bars that has to become the app
        // background instead, or the bar strips stay splash-navy.
        getWindow().setBackgroundDrawable(
            new ColorDrawable(getResources().getColor(R.color.appBackground, getTheme()))
        );

        // Dark bar icons — the bars sit over the app's light background. Posted
        // so it lands after the bridge has finished its own window setup.
        getWindow().getDecorView().post(() -> {
            WindowInsetsControllerCompat bars =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            bars.setAppearanceLightStatusBars(true);
            bars.setAppearanceLightNavigationBars(true);
        });

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
