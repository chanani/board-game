package com.boardgame.member.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.net.URI;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;
import org.springframework.web.socket.messaging.WebSocketStompClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DuplicateLoginApiTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    private final WebSocketStompClient stompClient = createClient();

    private static WebSocketStompClient createClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    private String signUp() {
        String loginId = "d" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        rest.postForEntity("/api/members",
                Map.of("loginId", loginId, "nickname", loginId.substring(0, 7), "password", "password1"),
                JsonNode.class);
        return loginId;
    }

    private String login(String loginId) {
        return loginWith(loginId, null);
    }

    private String loginWith(String loginId, String cookie) {
        HttpHeaders headers = jsonHeaders(cookie);
        ResponseEntity<JsonNode> response = rest.exchange("/api/auth/login", HttpMethod.POST,
                new HttpEntity<>(Map.of("loginId", loginId, "password", "password1"), headers), JsonNode.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
    }

    private HttpHeaders jsonHeaders(String cookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (cookie != null) {
            headers.add(HttpHeaders.COOKIE, cookie);
        }
        return headers;
    }

    private ResponseEntity<JsonNode> me(String cookie) {
        return rest.exchange("/api/members/me", HttpMethod.GET, new HttpEntity<>(jsonHeaders(cookie)),
                JsonNode.class);
    }

    private void logout(String cookie) {
        ResponseEntity<Void> response = rest.exchange("/api/auth/logout", HttpMethod.POST,
                new HttpEntity<>(jsonHeaders(cookie)), Void.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    private StompSession connect(String cookie) throws Exception {
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, cookie);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake,
                new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
    }

    private boolean disconnectedWithin(StompSession session, long millis) throws InterruptedException {
        long deadline = System.currentTimeMillis() + millis;
        while (System.currentTimeMillis() < deadline) {
            if (!session.isConnected()) {
                return true;
            }
            Thread.sleep(50);
        }
        return !session.isConnected();
    }

    @Test
    void 같은_아이디로_다시_로그인하면_이전_세션은_SESSION_REPLACED로_거절된다() {
        String loginId = signUp();
        String first = login(loginId);
        String second = login(loginId);

        ResponseEntity<JsonNode> replaced = me(first);
        assertThat(replaced.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(replaced.getBody().get("status").asInt()).isEqualTo(401);
        assertThat(replaced.getBody().get("code").asText()).isEqualTo("SESSION_REPLACED");
        assertThat(replaced.getBody().get("message").asText()).isEqualTo("다른 곳에서 로그인해서 로그아웃됐어요.");
        assertThat(me(second).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 로그아웃한_뒤_다시_로그인하면_정상이다() {
        String loginId = signUp();
        login(loginId);
        String second = login(loginId);

        logout(second);
        String third = login(loginId);

        assertThat(me(third).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(me(second).getBody().get("code").asText()).isEqualTo("UNAUTHORIZED");
    }

    @Test
    void 같은_세션으로_다시_로그인해도_그_세션은_유지된다() {
        String loginId = signUp();
        String first = login(loginId);

        String renewed = loginWith(loginId, first);

        assertThat(me(renewed).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void 모르는_세션은_UNAUTHORIZED다() {
        ResponseEntity<JsonNode> response = me("JSESSIONID=bogus");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().get("code").asText()).isEqualTo("UNAUTHORIZED");
    }

    @Test
    void 다시_로그인하면_이전_세션의_STOMP_연결이_끊긴다() throws Exception {
        String loginId = signUp();
        String first = login(loginId);
        StompSession stomp = connect(first);
        assertThat(stomp.isConnected()).isTrue();

        login(loginId);

        assertThat(disconnectedWithin(stomp, 3000)).isTrue();
    }

    @Test
    void 다시_로그인하면_이전_세션의_WebSocket이_4001로_닫힌다() throws Exception {
        String loginId = signUp();
        String first = login(loginId);
        CompletableFuture<CloseStatus> closed = new CompletableFuture<>();
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, first);
        new StandardWebSocketClient().execute(new AbstractWebSocketHandler() {
            @Override
            public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
                closed.complete(status);
            }
        }, handshake, URI.create("ws://localhost:" + port + "/ws")).get(5, TimeUnit.SECONDS);

        login(loginId);

        CloseStatus status = closed.get(3, TimeUnit.SECONDS);
        assertThat(status.getCode()).isEqualTo(4001);
    }
}
