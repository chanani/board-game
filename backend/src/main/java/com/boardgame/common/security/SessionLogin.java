package com.boardgame.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
public class SessionLogin {

    private final SecurityContextRepository securityContextRepository;
    private final ActiveSessions activeSessions;

    public SessionLogin(SecurityContextRepository securityContextRepository, ActiveSessions activeSessions) {
        this.securityContextRepository = securityContextRepository;
        this.activeSessions = activeSessions;
    }

    public void establish(LoginMember member, HttpServletRequest request, HttpServletResponse response) {
        renewSessionIdIfPresent(request);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(member, null, List.of()));
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        activeSessions.replace(member.id(), request.getSession());
    }

    private void renewSessionIdIfPresent(HttpServletRequest request) {
        if (request.getSession(false) == null) {
            return;
        }
        request.changeSessionId();
    }
}
