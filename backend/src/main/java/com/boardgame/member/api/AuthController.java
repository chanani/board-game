package com.boardgame.member.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.common.security.SessionLogin;
import com.boardgame.member.application.MemberService;
import com.boardgame.member.domain.Member;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final MemberService memberService;
    private final SessionLogin sessionLogin;

    public AuthController(MemberService memberService, SessionLogin sessionLogin) {
        this.memberService = memberService;
        this.sessionLogin = sessionLogin;
    }

    @PostMapping("/login")
    public MemberResponse login(@RequestBody LoginRequest request,
                                HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        Member member = memberService.authenticate(request);
        sessionLogin.establish(LoginMember.from(member), httpRequest, httpResponse);
        return MemberResponse.from(member);
    }
}
