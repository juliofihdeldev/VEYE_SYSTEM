# VEYe — release shrinking (enable isMinifyEnabled when ready)

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Firebase / Play Services
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# OkHttp (used by GlobalAlertRepository)
-dontwarn okhttp3.**
-dontwarn okio.**

# Kotlin coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}

# Parcelable / Maps
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# OneSignal (when minify is enabled)
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**
