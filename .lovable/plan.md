

# Push Notification UX Cleanup

## Changes

### 1. `supabase/functions/send-push-notification/index.ts`

**a) Fix message field** (line 175): Use `record.body` with `record.content` as fallback.

**b) Fix unread count query** (line 212): Change `.eq("is_read", false)` to `.eq("read", false)`.

**c) Fix body format** (lines 216-220): Remove sender name duplication. Body becomes just the preview (1 unread) or `"{count} yeni mesaj • Son: {preview}"` (multiple unread). Title stays as sender name.

**d) Android notification block** (lines 261-268): Add `sound: "default"`, `icon: "ic_notification"`, `notification_count: unread`, change `channel_id` from `"messages"` to `"messages_v2"`.

### 2. Android notification icon

Place the uploaded PNG at `android/app/src/main/res/drawable/ic_notification.png`. FCM's `icon: "ic_notification"` resolves to `@drawable/ic_notification`.

### 3. `android/app/src/main/AndroidManifest.xml`

Add inside `<application>`:
```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@drawable/ic_notification" />
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="messages_v2" />
```

### 4. `src/hooks/usePushNotifications.ts`

- Create `messages_v2` channel with `importance: 5` (MAX) and `vibration: true` -- **no `sound` field** (omit it entirely, let Android use platform default behavior)
- Keep existing `messages`, `appointments`, `admin` channels but also remove `sound: 'default'` from all of them (same Capacitor issue)

### 5. Post-deploy notes

- **Must uninstall and reinstall the Android app** so the new `messages_v2` channel is created fresh with correct settings
- Redeploy Edge Function from Dashboard (copy-paste updated code)
- Rebuild Android APK with new icon + manifest changes
- iOS benefits automatically from the improved title/body formatting

### Final notification format

- **Title**: "Ahmet" (sender name only)
- **Body (1 unread)**: "Merhaba, nasılsın?" (preview only)
- **Body (N unread)**: "3 yeni mesaj • Son: Merhaba, nasılsın?"

