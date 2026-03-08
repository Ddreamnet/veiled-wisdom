

# Fix: iOS Posting APNs Token Instead of FCM Token

## Problem
Line 25 of `AppDelegate.swift` posts the raw APNs `deviceToken` (Data) to Capacitor's registration notification. Capacitor then hands this to the JS layer, which stores it in `push_devices.fcm_token`. FCM rejects it with `INVALID_ARGUMENT`.

## Fix

**`ios/App/App/AppDelegate.swift`** — single change in `didRegisterForRemoteNotificationsWithDeviceToken`:

1. Set `Messaging.messaging().apnsToken = deviceToken` (keep this)
2. **Remove** the line that posts raw deviceToken to Capacitor
3. **Add** `Messaging.messaging().token { token, error in ... }` to fetch the actual FCM token
4. Post the FCM token **string** (not Data) via `.capacitorDidRegisterForRemoteNotifications`
5. Add `NSLog` statements for debugging (APNs received, FCM token fetched, error if any)

Also update `messaging(_:didReceiveRegistrationToken:)` to post refreshed FCM tokens to Capacitor (handles token rotation).

```swift
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

func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let fcmToken = fcmToken else { return }
    NSLog("[Push] FCM token refreshed: \(fcmToken.prefix(20))...")
    NotificationCenter.default.post(
        name: .capacitorDidRegisterForRemoteNotifications,
        object: fcmToken
    )
}
```

## Post-fix
- **Yes, delete the old invalid iOS `push_devices` row** before retesting. The old row has a garbage APNs token that will never work.
- Rebuild iOS app with the updated AppDelegate.
- No JS-side changes needed — `usePushNotifications.ts` already stores `token.value` which will now be the correct FCM token.

