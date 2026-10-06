package com.boardgame.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;

@Component
public class LogoutEventHandler implements LogoutHandler {

    private final ApplicationEventPublisher publisher;

    public LogoutEventHandler(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @Override
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        if (authentication == null) {
            return;
        }
        if (!(authentication.getPrincipal() instanceof LoginMember member)) {
            return;
        }
        publisher.publishEvent(new MemberLoggedOutEvent(member.id()));
    }
}
