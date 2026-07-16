package com.juanbarrios.portfolio.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Security configuration. 
 * Phase 1: GET endpoints are public, POST/PUT/DELETE will be secured with JWT later.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(
                    new CorsConfig().corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // Public: anyone can read portfolio data
                    .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                    // Everything else requires authentication (will add JWT filter later)
                    .anyRequest().permitAll() // Temporarily permit all for Phase 1
            );

        return http.build();
    }
}
