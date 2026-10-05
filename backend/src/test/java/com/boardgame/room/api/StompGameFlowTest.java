package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StompGameFlowTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    private final WebSocketStompClient stompClient = createClient();

    private record Player(long id, String cookie, StompSession stomp,
                          BlockingQueue<JsonNode> views, BlockingQueue<JsonNode> errors) {
    }

    private static WebSocketStompClient createClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    private HttpHeaders headers(String cookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(HttpHeaders.COOKIE, cookie);
        return headers;
    }

    private ResponseEntity<JsonNode> post(String path, Object body, String cookie) {
        return rest.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers(cookie)), JsonNode.class);
    }

    private String[] signUpAndLogin() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Map<String, String> member = Map.of("loginId", "s" + suffix, "nickname", "s" + suffix.substring(0, 6),
                "password", "password1");
        rest.postForEntity("/api/members", member, JsonNode.class);
        ResponseEntity<JsonNode> login = rest.postForEntity("/api/auth/login",
                Map.of("loginId", "s" + suffix, "password", "password1"), JsonNode.class);
        String cookie = login.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
        return new String[]{login.getBody().get("id").asText(), cookie};
    }

    private StompSession connect(String cookie) throws Exception {
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, cookie);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake,
                new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
    }

    private BlockingQueue<JsonNode> subscribe(StompSession session, String destination) {
        BlockingQueue<JsonNode> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return JsonNode.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((JsonNode) payload);
            }
        });
        return queue;
    }

    private Player player() throws Exception {
        String[] credentials = signUpAndLogin();
        StompSession stomp = connect(credentials[1]);
        return new Player(Long.parseLong(credentials[0]), credentials[1], stomp,
                subscribe(stomp, "/user/queue/game"), subscribe(stomp, "/user/queue/errors"));
    }

    private void send(Player player, String code, Map<String, Object> action) {
        player.stomp().send("/app/rooms/" + code + "/actions", action);
    }

    // 구독이 등록될 때까지 sync를 반복해 첫 화면을 받는다
    private JsonNode syncUntilView(Player player, String code) throws InterruptedException {
        for (int attempt = 0; attempt < 20; attempt++) {
            player.stomp().send("/app/rooms/" + code + "/sync", Map.of());
            JsonNode view = player.views().poll(250, TimeUnit.MILLISECONDS);
            if (view != null) {
                return view;
            }
        }
        throw new AssertionError("게임 화면을 받지 못했습니다");
    }

    private JsonNode awaitView(Player player, Predicate<JsonNode> condition) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            JsonNode view = player.views().poll(250, TimeUnit.MILLISECONDS);
            if (view != null && condition.test(view)) {
                return view;
            }
        }
        throw new AssertionError("조건을 만족하는 화면을 받지 못했습니다");
    }

    private String startedRoom(Player host, Player guest) {
        String code = post("/api/rooms", Map.of("name", "실시간 방", "gameType", "PAPER_SAFARI"), host.cookie())
                .getBody().get("code").asText();
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        post("/api/rooms/" + code + "/start", Map.of(), host.cookie());
        return code;
    }

    @Test
    void STOMP로_게임을_진행하고_상대가_뽑은_카드는_보이지_않는다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);

        JsonNode first = syncUntilView(host, code);
        syncUntilView(guest, code);
        assertThat(first.at("/game/round/phase").asText()).isEqualTo("SETUP_FLIP");
        assertThat(first.at("/game/round/boards").size()).isEqualTo(2);

        send(host, code, Map.of("type", "FLIP", "column", 0, "row", 0));
        send(guest, code, Map.of("type", "FLIP", "column", 0, "row", 0));
        JsonNode drawing = awaitView(host, view -> view.at("/game/round/phase").asText().equals("DRAW"));

        long currentId = drawing.at("/game/round/currentPlayerId").asLong();
        Player current = currentId == host.id() ? host : guest;
        Player waiting = currentId == host.id() ? guest : host;

        send(waiting, code, Map.of("type", "DRAW_DECK"));
        JsonNode error = waiting.errors().poll(5, TimeUnit.SECONDS);
        assertThat(error).isNotNull();
        assertThat(error.get("status").asInt()).isEqualTo(409);
        assertThat(error.get("code").asText()).isEqualTo("NOT_YOUR_TURN");

        send(current, code, Map.of("type", "DRAW_DECK"));
        JsonNode mine = awaitView(current, view -> view.at("/game/round/phase").asText().equals("PLACE"));
        JsonNode theirs = awaitView(waiting, view -> view.at("/game/round/phase").asText().equals("PLACE"));
        assertThat(mine.at("/game/round/held/card").isObject()).isTrue();
        assertThat(theirs.at("/game/round/held/card").isNull()).isTrue();
        assertThat(theirs.at("/game/round/held/source").asText()).isEqualTo("DECK");
    }

    @Test
    void 로그인하지_않으면_WebSocket에_연결할_수_없다() {
        assertThatThrownBy(() -> connect("JSESSIONID=invalid")).isInstanceOf(Exception.class);
    }
}
