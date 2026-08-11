package com.appcorrespondencia.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    // Estáticos de propósito: o recreate() troca a Activity, mas o processo é o
    // mesmo — é o que permite perceber a queda em sequência.
    private static long ultimaMorteRenderer = 0L;
    private static int mortesSeguidasRenderer = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        // Tratamento moderno de insets (substitui APIs descontinuadas)
        ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(), (view, windowInsets) -> {
            return WindowInsetsCompat.CONSUMED;
        });

        // O processo de renderização do WebView pode ser morto pelo sistema —
        // tipicamente ao voltar da câmera, que é quando a memória do aparelho
        // está no limite. Sem tratar este evento o Android encerra o app
        // inteiro, que é o "aplicativo reiniciando sozinho" relatado pelos
        // porteiros. Assumindo o evento, só a tela é remontada.
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                long agora = SystemClock.elapsedRealtime();
                mortesSeguidasRenderer = (agora - ultimaMorteRenderer < 15000) ? mortesSeguidasRenderer + 1 : 1;
                ultimaMorteRenderer = agora;

                ViewGroup pai = (ViewGroup) webView.getParent();
                if (pai != null) {
                    pai.removeView(webView);
                }
                webView.destroy();

                // Queda repetida em poucos segundos não é falta de memória
                // passageira: remontar de novo deixaria o app piscando sem fim.
                // Devolvendo false o sistema encerra o processo, e o porteiro
                // reabre o app limpo.
                if (mortesSeguidasRenderer > 3 || isFinishing()) {
                    return false;
                }

                new Handler(Looper.getMainLooper()).post(MainActivity.this::recreate);
                return true;
            }
        });
    }
}
