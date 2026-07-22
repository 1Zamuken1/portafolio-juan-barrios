package com.juanbarrios.portfolio.domain.port.out;

public interface JwtPort {
    String generateToken(String username);
    String extractUsername(String token);
    boolean isTokenValid(String token, String username);
}
