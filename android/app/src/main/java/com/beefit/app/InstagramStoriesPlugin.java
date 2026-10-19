package com.beefit.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * Abre o editor de Stories do Instagram com o card do treino como fundo, pelo
 * protocolo "Sharing to Stories" da Meta.
 */
@CapacitorPlugin(name = "InstagramStories")
public class InstagramStoriesPlugin extends Plugin {

    private static final String INSTAGRAM_PACKAGE = "com.instagram.android";
    private static final String ADD_TO_STORY = "com.instagram.share.ADD_TO_STORY";

    @PluginMethod
    public void shareToStory(PluginCall call) {
        String fileUri = call.getString("uri");
        String appId = call.getString("appId", "");
        if (fileUri == null || fileUri.isEmpty()) {
            call.reject("uri obrigatoria");
            return;
        }

        Context context = getContext();
        File file = new File(Uri.parse(fileUri).getPath());
        if (!file.exists()) {
            call.reject("Arquivo do card nao encontrado");
            return;
        }

        // O Instagram le o arquivo em outro processo; so um content:// do FileProvider
        // com permissao concedida funciona, um file:// e recusado no Android 7+.
        Uri contentUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);

        Intent intent = new Intent(ADD_TO_STORY);
        intent.setDataAndType(contentUri, "image/png");
        intent.setPackage(INSTAGRAM_PACKAGE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (!appId.isEmpty()) {
            intent.putExtra("source_application", appId);
        }

        // Sem o <queries> do manifest, resolveActivity devolve null no Android 11+
        // mesmo com o Instagram instalado.
        if (intent.resolveActivity(context.getPackageManager()) == null) {
            resolveNotShared(call, "not-installed");
            return;
        }

        context.grantUriPermission(INSTAGRAM_PACKAGE, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            getActivity().startActivity(intent);
        } catch (ActivityNotFoundException error) {
            resolveNotShared(call, "not-installed");
            return;
        }

        JSObject result = new JSObject();
        result.put("shared", true);
        call.resolve(result);
    }

    private void resolveNotShared(PluginCall call, String reason) {
        JSObject result = new JSObject();
        result.put("shared", false);
        result.put("reason", reason);
        call.resolve(result);
    }
}
