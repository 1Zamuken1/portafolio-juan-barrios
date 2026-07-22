package com.juanbarrios.portfolio.application.usecase;

import com.juanbarrios.portfolio.domain.port.out.JwtPort;

public class AuthUseCase {

    private final JwtPort jwtPort;
    private final String adminUsername;
    private final String adminPassword;

    public AuthUseCase(JwtPort jwtPort, String adminUsername, String adminPassword) {
        this.jwtPort = jwtPort;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
    }

    public String login(String username, String password) {
        if (adminUsername.equals(username) && adminPassword.equals(password)) {
            return jwtPort.generateToken(username);
        }
        throw new RuntimeException("Invalid credentials");
    }
}
