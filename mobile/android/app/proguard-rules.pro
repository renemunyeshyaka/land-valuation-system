-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

-keepclassmembers class ** {
    @org.greenrobot.eventbus.Subscribe <methods>;
}

-keep enum org.greenrobot.eventbus.ThreadMode { *; }

-keepclassmembers class * extends org.greenrobot.eventbus.util.ThrowableFailureEvent {
    <init>(java.lang.Throwable);
}

# Gson
-keepattributes Signature
-keepattributes *Annotation*
-dontwarn sun.misc.**
-keep class com.google.gson.stream.** { *; }
-keep class com.google.gson.** { *; }
-keep interface com.google.gson.** { *; }

# Retrofit
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }
-dontwarn retrofit2.**

# OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**

# Mapbox
-keep class com.mapbox.mapboxsdk.** { *; }
-keep interface com.mapbox.mapboxsdk.** { *; }

# Stripe
-keep class com.stripe.** { *; }
-keep interface com.stripe.** { *; }

# Glide
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule {
    <init>(...);
}
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
    **[] $VALUES;
    public *;
}
