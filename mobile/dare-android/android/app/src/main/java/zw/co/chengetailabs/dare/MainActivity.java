package zw.co.chengetailabs.dare;

import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Adds native pull-to-refresh around the WebView. Offline / load-error
 * handling is not implemented here - it's Capacitor's own built-in
 * server.errorPath behaviour (see capacitor.config.json), which already
 * redirects the WebView to the bundled offline.html on any main-frame
 * load failure. Link/domain navigation (allowNavigation) and the JS
 * bridge are left entirely to Capacitor's default BridgeWebViewClient.
 */
public class MainActivity extends BridgeActivity {

  private SwipeRefreshLayout swipeRefreshLayout;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    final WebView webView = this.bridge.getWebView();

    webView.setWebViewClient(new BridgeWebViewClient(this.bridge) {
      @Override
      public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (swipeRefreshLayout != null && swipeRefreshLayout.isRefreshing()) {
          swipeRefreshLayout.setRefreshing(false);
        }
      }
    });

    ViewGroup parent = (ViewGroup) webView.getParent();
    int index = parent.indexOfChild(webView);
    parent.removeView(webView);

    swipeRefreshLayout = new SwipeRefreshLayout(this);
    swipeRefreshLayout.setLayoutParams(
      new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    );
    swipeRefreshLayout.setColorSchemeColors(0xFF22C55E, 0xFFEAB308, 0xFF0F5A34);
    swipeRefreshLayout.addView(webView);
    parent.addView(swipeRefreshLayout, index);

    swipeRefreshLayout.setOnRefreshListener(() -> webView.reload());
  }
}
