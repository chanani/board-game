package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.oldmaid.OldMaidShuffler;
import com.boardgame.oldmaid.PlayingCard;
import com.boardgame.oldmaid.SlotPicker;
import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Type;
import java.util.ArrayList;
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
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
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

// 한 칸 돌린 덱 + 첫 사람 seat 0 + 끼우는 자리 0: 방장 [스페이드 A(0)], 손님 [다이아몬드 A(26), 조커(52)]
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(OldMaidStompFlowTest.RotatedDeck.class)
class OldMaidStompFlowTest {

    @TestConfiguration
    static class RotatedDeck {

        @Bean
        @Primary
        OldMaidShuffler rotatedOldMaidShuffler() {
            return cards -> {
                List<PlayingCard> rotated = new ArrayList<>(cards.subList(1, cards.size()));
                rotated.add(cards.get(0));
                return rotated;
            };
        }

        @Bean
        @Primary
        SlotPicker firstSlotPicker() {
            return bound -> 0;
        }
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    private final WebSocketStompClient stompClient = createClient();

    private record Player(long id, String cookie, StompSession stomp, BlockingQueue<JsonNode> views,
                          BlockingQueue<JsonNode> errors, BlockingQueue<JsonNode> signals) {
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
                subscribe(stomp, "/user/queue/game"), subscribe(stomp, "/user/queue/errors"),
                subscribe(stomp, "/user/queue/signal"));
    }

    private void send(Player player, String code, Map<String, Object> action) {
        player.stomp().send("/app/rooms/" + code + "/actions", action);
    }

    private void signal(Player player, String code, Map<String, Object> signal) {
        player.stomp().send("/app/rooms/" + code + "/signals", signal);
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

    // 앞서 쌓인 화면(시작·관전 입장·여분 sync 응답)을 비운다.
    private static void drain(BlockingQueue<JsonNode> queue) throws InterruptedException {
        while (queue.poll(300, TimeUnit.MILLISECONDS) != null) {
            queue.clear();
        }
    }

    private String startedRoom(Player host, Player guest) {
        String code = post("/api/rooms", Map.of("name", "도둑잡기 방", "gameType", "OLD_MAID"), host.cookie())
                .getBody().get("code").asText();
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        post("/api/rooms/" + code + "/ready", Map.of("ready", true), guest.cookie());
        post("/api/rooms/" + code + "/start", Map.of(), host.cookie());
        return code;
    }

    @Test
    void 상대_손패는_장수만_보이고_조커는_주인만_본다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);

        JsonNode mine = syncUntilView(host, code);
        JsonNode theirs = syncUntilView(guest, code);

        assertThat(mine.get("gameType").asText()).isEqualTo("OLD_MAID");
        assertThat(mine.at("/game/hand").toString()).isEqualTo("[{\"id\":0,\"suit\":\"SPADES\",\"rank\":\"ACE\"}]");
        assertThat(mine.at("/game/currentPlayerId").asLong()).isEqualTo(host.id());
        assertThat(mine.at("/game/targetId").asLong()).isEqualTo(guest.id());
        assertThat(mine.at("/game/players/1/cardCount").asInt()).isEqualTo(2);
        assertThat(mine.toString()).doesNotContain("JOKER").doesNotContain("\"id\":26,");
        assertThat(theirs.at("/game/hand/1/rank").asText()).isEqualTo("JOKER");
        assertThat(theirs.at("/game/canShuffle").asBoolean()).isTrue();
    }

    @Test
    void 뽑기는_두_화면을_바꾸고_남의_차례면_NOT_YOUR_TURN이다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);
        syncUntilView(host, code);
        syncUntilView(guest, code);

        send(guest, code, Map.of("type", "DRAW", "index", 0));
        JsonNode notYours = guest.errors().poll(5, TimeUnit.SECONDS);
        assertThat(notYours).isNotNull();
        assertThat(notYours.get("status").asInt()).isEqualTo(409);
        assertThat(notYours.get("code").asText()).isEqualTo("NOT_YOUR_TURN");

        send(host, code, Map.of("type", "DRAW", "index", 1));
        JsonNode drawn = awaitView(host, view -> view.at("/game/hand").size() == 2);
        JsonNode lost = awaitView(guest, view -> view.at("/game/hand").size() == 1);
        assertThat(drawn.at("/game/hand/0/rank").asText()).isEqualTo("JOKER");
        assertThat(drawn.at("/game/currentPlayerId").asLong()).isEqualTo(guest.id());
        assertThat(lost.at("/game/events/0/type").asText()).isEqualTo("DRAW");
        assertThat(lost.at("/game/events/0/cards").size()).isZero();
        assertThat(lost.toString()).doesNotContain("JOKER");
    }

    @Test
    void 뽑는_사람의_신호만_방의_모두에게_가고_남의_신호는_아무에게도_안_간다() throws Exception {
        Player host = player();
        Player guest = player();
        Player watcher = player();
        String code = startedRoom(host, guest);
        post("/api/rooms/" + code + "/watch", Map.of(), watcher.cookie());
        syncUntilView(host, code);
        syncUntilView(guest, code);
        syncUntilView(watcher, code);
        drain(guest.views());

        signal(guest, code, Map.of("type", "PEEK", "index", 0));
        assertThat(host.signals().poll(500, TimeUnit.MILLISECONDS)).isNull();

        signal(host, code, Map.of("type", "PEEK", "index", 1));
        JsonNode toGuest = guest.signals().poll(5, TimeUnit.SECONDS);
        JsonNode toWatcher = watcher.signals().poll(5, TimeUnit.SECONDS);
        assertThat(toGuest).isNotNull();
        assertThat(toGuest.get("gameType").asText()).isEqualTo("OLD_MAID");
        assertThat(toGuest.get("type").asText()).isEqualTo("PEEK");
        assertThat(toGuest.get("index").asInt()).isEqualTo(1);
        assertThat(toGuest.get("drawerId").asLong()).isEqualTo(host.id());
        assertThat(toGuest.get("targetId").asLong()).isEqualTo(guest.id());
        assertThat(toWatcher.get("seq").asLong()).isEqualTo(toGuest.get("seq").asLong());
        assertThat(guest.views().poll(300, TimeUnit.MILLISECONDS)).isNull();
        assertThat(guest.errors().poll(100, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void 섞기를_1초_안에_다시_하면_429다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);
        syncUntilView(guest, code);

        send(guest, code, Map.of("type", "SHUFFLE"));
        awaitView(guest, view -> view.at("/game/events/0/type").asText().equals("SHUFFLE"));
        send(guest, code, Map.of("type", "SHUFFLE"));

        JsonNode tooFast = guest.errors().poll(5, TimeUnit.SECONDS);
        assertThat(tooFast).isNotNull();
        assertThat(tooFast.get("status").asInt()).isEqualTo(429);
        assertThat(tooFast.get("code").asText()).isEqualTo("OLD_MAID_SHUFFLE_TOO_FAST");
    }

    @Test
    void 기권해_나간_사람은_다시_들어와도_끝난_게임_결과를_받지_않는다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);
        syncUntilView(guest, code);

        post("/api/rooms/" + code + "/leave", Map.of(), guest.cookie());
        awaitView(host, view -> view.at("/game/status").asText().equals("GAME_OVER"));
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        guest.views().clear();
        guest.stomp().send("/app/rooms/" + code + "/sync", Map.of());

        assertThat(guest.views().poll(1, TimeUnit.SECONDS)).isNull();
    }
}
