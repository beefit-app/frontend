import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    // Plugins que vivem no target do app não são descobertos pelo Capacitor CLI;
    // precisam ser registrados na bridge à mão.
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(InstagramStoriesPlugin())
    }
}
