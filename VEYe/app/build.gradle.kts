import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)
    alias(libs.plugins.google.services)
}

fun normalizeMapsApiKey(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    return raw.trim()
        .removeSurrounding("\"")
        .trim()
        .removeSurrounding("'")
        .trim()
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { localProperties.load(it) }
}
val googleMapsApiKey =
    normalizeMapsApiKey(
        System.getenv("GOOGLE_MAPS_API_KEY")
            ?: localProperties.getProperty("GOOGLE_MAPS_API_KEY")
            ?: (project.findProperty("GOOGLE_MAPS_API_KEY") as? String),
    )

android {
    namespace = "com.elitesoftwarestudio.veye"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.elitesoftwarestudio.veye"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        manifestPlaceholders["GOOGLE_MAPS_API_KEY"] = googleMapsApiKey

        val processGlobalAlertUrl =
            localProperties.getProperty("PROCESS_GLOBAL_ALERT_URL")
                ?: "https://us-central1-edel-34e48.cloudfunctions.net/processGlobalAlert"
        buildConfigField("String", "PROCESS_GLOBAL_ALERT_URL", "\"$processGlobalAlertUrl\"")
        buildConfigField("boolean", "MAPS_API_KEY_CONFIGURED", "${googleMapsApiKey.isNotEmpty()}")

        val oneSignalAppId =
            localProperties.getProperty("ONESIGNAL_APP_ID")
                ?: "1766902d-eca3-4350-aaaa-bd8704a47548"
        buildConfigField("String", "ONESIGNAL_APP_ID", "\"$oneSignalAppId\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.appcompat)
    implementation(libs.material)

    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.coil.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)

    implementation(libs.hilt.android)
    implementation(libs.hilt.navigation.compose)
    ksp(libs.hilt.compiler)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth.ktx)
    implementation(libs.firebase.firestore.ktx)
    implementation(libs.firebase.analytics)
    implementation(libs.kotlinx.coroutines.play.services)
    implementation(libs.onesignal)

    implementation(libs.androidx.datastore.preferences)

    implementation(libs.play.services.maps)
    implementation(libs.play.services.location)
    implementation(libs.maps.compose)
    implementation(libs.maps.compose.utils)
    implementation(libs.android.maps.utils)
    implementation(libs.okhttp)

    debugImplementation(libs.androidx.compose.ui.tooling)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
}
