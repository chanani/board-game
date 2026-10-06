package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.uno.StarterPicker;
import com.boardgame.uno.UnoCard;
import com.boardgame.uno.UnoShuffler;
import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
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
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
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
@Import(UnoStompFlowTest.ReversedDeck.class)
class UnoStompFlowTest {

    @TestConfiguration
    static class ReversedDeck {

        @Bean
        @Primary
        UnoShuffler reversedUnoShuffler() {
            return cards -> {
                List<UnoCard> copy = new ArrayList<>(cards);
                Collections.reverse(copy);
                return copy;
            };
        }

        @Bean
        @Primary
        StarterPicker firstSeatStarter() {
            return count -> 0;
        }
    }

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
        return connect(cookie, new StompSessionHandlerAdapter() {
        });
    }

    private StompSession connect(String cookie, StompSessionHandlerAdapter handler) throws Exception {
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, cookie);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake, handler)
                .get(5, TimeUnit.SECONDS);
    }

    // 서버가 보낸 ERROR 프레임이나 연결 끊김을 모아 둔다
    private static StompSessionHandlerAdapter recordingProblems(BlockingQueue<String> problems) {
        return new StompSessionHandlerAdapter() {
            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                problems.add("ERROR " + headers.getFirst("message"));
            }

            @Override
            public void handleTransportError(StompSession session, Throwable exception) {
                problems.add("TRANSPORT " + exception);
            }
        };
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

    private String startedUnoRoom(Player host, Player guest) {
        String code = post("/api/rooms", Map.of("name", "우노 방", "gameType", "UNO"), host.cookie())
                .getBody().get("code").asText();
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        post("/api/rooms/" + code + "/ready", Map.of("ready", true), guest.cookie());
        post("/api/rooms/" + code + "/start", Map.of(), host.cookie());
        return code;
    }

    @Test
    void 우노_방을_STOMP로_진행하고_상대_손패는_장수만_보인다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedUnoRoom(host, guest);

        JsonNode mine = syncUntilView(host, code);
        JsonNode theirs = syncUntilView(guest, code);

        assertThat(mine.get("gameType").asText()).isEqualTo("UNO");
        assertThat(mine.at("/game/hand").size()).isEqualTo(7);
        assertThat(mine.at("/game/currentPlayerId").asLong()).isEqualTo(host.id());
        assertThat(mine.at("/game/stage").asText()).isEqualTo("PLAY");
        assertThat(mine.at("/game/discardTop/id").asInt()).isEqualTo(93);
        assertThat(mine.at("/game/players").size()).isEqualTo(2);
        assertThat(mine.at("/game/players/1/cardCount").asInt()).isEqualTo(7);
        assertThat(theirs.at("/game/hand").size()).isEqualTo(7);
        assertThat(theirs.toString()).doesNotContain("\"id\":101,");

        send(guest, code, Map.of("type", "DRAW"));
        JsonNode notYours = guest.errors().poll(5, TimeUnit.SECONDS);
        assertThat(notYours).isNotNull();
        assertThat(notYours.get("status").asInt()).isEqualTo(409);
        assertThat(notYours.get("code").asText()).isEqualTo("NOT_YOUR_TURN");

        send(host, code, Map.of("type", "PLAY", "cardId", 101, "color", "PURPLE"));
        JsonNode badColor = host.errors().poll(5, TimeUnit.SECONDS);
        assertThat(badColor).isNotNull();
        assertThat(badColor.get("status").asInt()).isEqualTo(400);
        assertThat(badColor.get("code").asText()).isEqualTo("UNO_INVALID_COLOR");

        send(host, code, Map.of("type", "DRAW"));
        JsonNode drawn = awaitView(host, view -> view.at("/game/stage").asText().equals("DRAWN"));
        JsonNode watched = awaitView(guest, view -> view.at("/game/stage").asText().equals("DRAWN"));
        assertThat(drawn.at("/game/drawnCardId").asInt()).isEqualTo(92);
        assertThat(drawn.at("/game/hand").size()).isEqualTo(8);
        assertThat(watched.at("/game/drawnCardId").isNull()).isTrue();
        assertThat(watched.at("/game/players/0/cardCount").asInt()).isEqualTo(8);
        assertThat(watched.at("/game/events/0/type").asText()).isEqualTo("DRAW");
        assertThat(watched.at("/game/events/0/card").isNull()).isTrue();
    }

    @Test
    void 관전자는_우노_손패를_받지_못한다() throws Exception {
        Player host = player();
        Player guest = player();
        Player watcher = player();
        String code = startedUnoRoom(host, guest);
        post("/api/rooms/" + code + "/watch", Map.of(), watcher.cookie());

        JsonNode view = syncUntilView(watcher, code);

        assertThat(view.get("gameType").asText()).isEqualTo("UNO");
        assertThat(view.at("/game/hand").isNull()).isTrue();
        assertThat(view.at("/game/canCatch").asBoolean()).isFalse();
        assertThat(view.at("/game/players/0/cardCount").asInt()).isEqualTo(7);
    }
}
