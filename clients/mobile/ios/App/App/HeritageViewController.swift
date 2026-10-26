import Capacitor

public class HeritageViewController: CAPBridgeViewController {
    public override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureAuthStoragePlugin())
    }
}
