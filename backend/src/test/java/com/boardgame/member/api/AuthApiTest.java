package com.boardgame.member.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.member.domain.MemberRepository;
import com.boardgame.member.domain.PasswordEncryptor;
import com.boardgame.member.domain.RawPassword;
import com.boardgame.member.domain.PasswordHash;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncryptor passwordEncryptor;

    private ResultActions signUp(String loginId, String nickname, String password) throws Exception {
        return mockMvc.perform(post("/api/members")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"loginId": "%s", "nickname": "%s", "password": "%s"}
                        """.formatted(loginId, nickname, password)));
    }

    private ResultActions login(String loginId, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"loginId": "%s", "password": "%s"}
                        """.formatted(loginId, password)));
    }

    private MockHttpSession loggedInSession(String loginId, String password) throws Exception {
        MvcResult result = login(loginId, password).andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void 회원가입하면_201과_회원_정보를_돌려주고_비밀번호는_보이지_않는다() throws Exception {
        signUp("alice01", "앨리스", "password1")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/members/")))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.loginId").value("alice01"))
                .andExpect(jsonPath("$.nickname").value("앨리스"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void 비밀번호는_BCrypt_해시로_저장된다() throws Exception {
        signUp("alice01", "앨리스", "password1").andExpect(status().isCreated());

        assertThat(memberRepository.findByCredentialsLoginIdValue("alice01")).hasValueSatisfying(member ->
                member.authenticate(RawPassword.unchecked("password1"), passwordEncryptor));
        PasswordHash hash = passwordEncryptor.encrypt(RawPassword.of("password1"));
        assertThat(hash.value()).startsWith("$2").isNotEqualTo("password1");
    }

    @Test
    void 같은_아이디로는_가입할_수_없다() throws Exception {
        signUp("alice01", "앨리스", "password1");

        signUp("ALICE01", "다른사람", "password1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("DUPLICATE_LOGIN_ID"))
                .andExpect(jsonPath("$.message").value("이미 사용 중인 아이디입니다."));
    }

    @Test
    void 같은_닉네임으로는_가입할_수_없고_앞뒤_공백도_같은_닉네임이다() throws Exception {
        signUp("alice01", "앨리스", "password1");

        signUp("bob01", " 앨리스 ", "password1")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_NICKNAME"));
    }

    @Test
    void 형식이_잘못된_값은_400과_항목별_코드로_응답한다() throws Exception {
        signUp("ab", "앨리스", "password1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_LOGIN_ID"));
        signUp("alice01", "가", "password1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_NICKNAME"));
        signUp("alice01", "앨리스", "short")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));
    }

    @Test
    void 깨진_JSON으로_가입하면_INVALID_INPUT() throws Exception {
        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"loginId\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void 로그인하면_세션으로_내_정보를_조회한다() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "password1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("alice01"))
                .andExpect(jsonPath("$.nickname").value("앨리스"));
        MockHttpSession session = loggedInSession("alice01", "password1");

        mockMvc.perform(get("/api/members/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loginId").value("alice01"))
                .andExpect(jsonPath("$.nickname").value("앨리스"));
    }

    @Test
    void 대문자로_가입해도_소문자_아이디로_로그인된다() throws Exception {
        signUp("Alice01", "앨리스", "password1");

        login("alice01", "password1").andExpect(status().isOk());
        login("ALICE01", "password1").andExpect(status().isOk());
    }

    @Test
    void 비밀번호가_틀리거나_아이디가_없으면_INVALID_CREDENTIALS() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        login("nobody", "password1")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void 로그인할_때_짧거나_빈_비밀번호도_INVALID_CREDENTIALS() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "x")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
        login("alice01", "")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void 로그인할_때_너무_긴_비밀번호도_INVALID_CREDENTIALS() throws Exception {
        signUp("alice01", "앨리스", "password1");

        login("alice01", "가".repeat(30))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void 로그인하지_않으면_API는_JSON_401이다() throws Exception {
        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.message").value("로그인이 필요합니다."));
    }

    @Test
    void 로그아웃하면_같은_세션으로_더_이상_조회할_수_없다() throws Exception {
        signUp("alice01", "앨리스", "password1");
        MockHttpSession session = loggedInSession("alice01", "password1");

        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/members/me").session(session))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void GET으로는_로그아웃되지_않는다() throws Exception {
        signUp("alice01", "앨리스", "password1");
        MockHttpSession session = loggedInSession("alice01", "password1");

        mockMvc.perform(get("/api/auth/logout").session(session));

        mockMvc.perform(get("/api/members/me").session(session))
                .andExpect(status().isOk());
    }
}
