package com.beefit.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins locais precisam ser registrados antes de super.onCreate, que
        // monta a bridge com a lista de plugins conhecida naquele momento.
        registerPlugin(InstagramStoriesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
