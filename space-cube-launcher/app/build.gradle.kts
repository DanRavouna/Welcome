plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.dan.spacecube"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.dan.spacecube"
        minSdk = 26          // Android 8.0+
        targetSdk = 34       // keeps the system bars outside the app (no edge-to-edge handling needed yet)
        versionCode = 5
        versionName = "0.5"
    }

    // One fixed signing key for every build, so a new APK installs OVER the old one
    // (Android refuses updates signed with a different key: "App not installed").
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}
