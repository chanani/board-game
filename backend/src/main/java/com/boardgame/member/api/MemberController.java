package com.boardgame.member.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.member.application.MemberService;
import com.boardgame.member.domain.Member;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @PostMapping
    public ResponseEntity<MemberResponse> signUp(@RequestBody SignUpRequest request) {
        Member member = memberService.register(request);
        MemberResponse response = MemberResponse.from(member);
        return ResponseEntity.created(URI.create("/api/members/" + response.id())).body(response);
    }

    @GetMapping("/me")
    public MemberResponse me(@AuthenticationPrincipal LoginMember loginMember) {
        return MemberResponse.from(memberService.find(loginMember.id()));
    }

    @PatchMapping("/me/avatar")
    public MemberResponse changeAvatar(@AuthenticationPrincipal LoginMember loginMember,
                                       @RequestBody ChangeAvatarRequest request) {
        return MemberResponse.from(memberService.changeAvatar(loginMember.id(), request));
    }
}
