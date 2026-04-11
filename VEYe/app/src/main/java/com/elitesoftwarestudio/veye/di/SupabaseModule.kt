package com.elitesoftwarestudio.veye.di

import com.elitesoftwarestudio.veye.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.functions.Functions
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.serializer.KotlinXSerializer
import io.ktor.client.engine.okhttp.OkHttp
import kotlinx.serialization.json.Json
import javax.inject.Singleton

/**
 * Phase C1 — Supabase Kotlin client (PostgREST, Auth, Realtime, Edge Functions).
 * Session persistence for Auth uses the library’s Android defaults (encrypted storage + refresh).
 *
 * Repositories still use Firebase until C2; inject [SupabaseClient] where you start migrating reads/writes.
 */
@Module
@InstallIn(SingletonComponent::class)
object SupabaseModule {

    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        return createSupabaseClient(
            supabaseUrl = BuildConfig.SUPABASE_URL,
            supabaseKey = BuildConfig.SUPABASE_ANON_KEY,
        ) {
            defaultSerializer = KotlinXSerializer(
                Json {
                    ignoreUnknownKeys = true
                    encodeDefaults = true
                },
            )
            httpEngine = OkHttp.create { }
            install(Auth) {
                host = "com.elitesoftwarestudio.veye.auth"
                scheme = "veye"
            }
            install(Postgrest)
            install(Realtime)
            install(Functions)
        }
    }
}
