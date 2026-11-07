# Phase 27 — R8 keep rules for release (optimization.enable = true).
# Keep JNI / Filament entry points and kotlinx.serialization content codecs.

-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod, SourceFile, LineNumberTable

# Filament + gltfio (native + reflective loaders).
-keep class com.google.android.filament.** { *; }
-keep class com.google.android.filament.gltfio.** { *; }
-keep class com.google.android.filament.utils.** { *; }
-keepclasseswithmembernames class * {
    native <methods>;
}

# kotlinx.serialization (content-pack / snapshot codecs in game-core).
-dontwarn kotlinx.serialization.**
-keep,includedescriptorclasses class com.willio.jeanvilma.fishshopping.core.**$$serializer { *; }
-keepclassmembers class com.willio.jeanvilma.fishshopping.core.** {
    *** Companion;
}
-keepclasseswithmembers class com.willio.jeanvilma.fishshopping.core.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# App entry + BuildConfig.
-keep class com.willio.jeanvilma.fishshopping.MainActivity { *; }
-keep class com.willio.jeanvilma.fishshopping.BuildConfig { *; }

# Compose / coroutines noise.
-dontwarn org.jetbrains.kotlin.**
-dontwarn androidx.compose.**
