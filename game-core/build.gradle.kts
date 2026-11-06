import org.jetbrains.kotlin.gradle.dsl.JvmTarget

/*
 * Canonical Fish Shopping simulation. Pure Kotlin/JVM: no Android, Compose or
 * Filament dependencies, so it runs in fast host unit tests and stays portable.
 */
plugins {
    alias(libs.plugins.kotlin.jvm)
}

java {
    sourceCompatibility = JavaVersion.VERSION_11
    targetCompatibility = JavaVersion.VERSION_11
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_11)
    }
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
    testImplementation(libs.junit)
}

tasks.test {
    // Tests read ../shared (content pack and parity fixtures); rerun when it changes.
    inputs.dir(layout.projectDirectory.dir("../shared"))
    // ./gradlew :game-core:test -PrecordFixtures=true rewrites shared/fixtures/starter-line.json
    systemProperty("recordFixtures", providers.gradleProperty("recordFixtures").getOrElse("false"))
}
