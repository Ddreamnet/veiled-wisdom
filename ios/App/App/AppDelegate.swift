import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        
        // Request notification authorization
        UNUserNotificationCenter.current().delegate = self as? UNUserNotificationCenterDelegate
        
        application.registerForRemoteNotifications()
        return true
    }

    // APNS token → Firebase → fetch FCM token
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        NSLog("[Push] APNs token received (\(deviceToken.count) bytes)")

        Messaging.messaging().token { token, error in
            if let error = error {
                NSLog("[Push] FCM token fetch error: \(error.localizedDescription)")
                return
            }
            guard let fcmToken = token else { return }
            NSLog("[Push] FCM token fetched: \(fcmToken.prefix(20))...")
            NotificationCenter.default.post(
                name: .capacitorDidRegisterForRemoteNotifications,
                object: fcmToken
            )
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // FCM token refresh
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        NSLog("[Push] FCM token refreshed: \(fcmToken.prefix(20))...")
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: fcmToken
        )
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
