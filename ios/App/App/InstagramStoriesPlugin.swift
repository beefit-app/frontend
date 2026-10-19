import Capacitor
import UIKit

/// Abre o editor de Stories do Instagram com o card do treino como fundo, pelo
/// protocolo "Sharing to Stories" da Meta.
@objc(InstagramStoriesPlugin)
public class InstagramStoriesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStoriesPlugin"
    public let jsName = "InstagramStories"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareToStory", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareToStory(_ call: CAPPluginCall) {
        guard let uri = call.getString("uri"), let fileURL = URL(string: uri) else {
            call.reject("uri obrigatoria")
            return
        }
        let appId = call.getString("appId") ?? ""

        // Desde 2023 o Instagram descarta o compartilhamento sem source_application.
        guard !appId.isEmpty else {
            call.resolve(["shared": false, "reason": "missing-app-id"])
            return
        }

        guard let imageData = try? Data(contentsOf: fileURL) else {
            call.reject("Arquivo do card nao encontrado")
            return
        }

        var components = URLComponents()
        components.scheme = "instagram-stories"
        components.host = "share"
        components.queryItems = [URLQueryItem(name: "source_application", value: appId)]
        guard let storiesURL = components.url else {
            call.reject("URL dos Stories invalida")
            return
        }

        DispatchQueue.main.async {
            // canOpenURL so enxerga o esquema listado em LSApplicationQueriesSchemes.
            guard UIApplication.shared.canOpenURL(storiesURL) else {
                call.resolve(["shared": false, "reason": "not-installed"])
                return
            }

            let items: [[String: Any]] = [["com.instagram.sharedSticker.backgroundImage": imageData]]
            UIPasteboard.general.setItems(items, options: [
                .expirationDate: Date().addingTimeInterval(5 * 60)
            ])
            UIApplication.shared.open(storiesURL, options: [:]) { opened in
                if opened {
                    call.resolve(["shared": true])
                } else {
                    call.resolve(["shared": false, "reason": "not-installed"])
                }
            }
        }
    }
}
