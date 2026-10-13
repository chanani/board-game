package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.fruitstack.Seed;
import com.boardgame.fruitstack.SeedSource;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import java.lang.reflect.Type;
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

// 씨앗을 12345로 고정한 실제 서버에서 점수 보고(SCORE·OUT)와 판 신호(BOARD)가 STOMP로 오가는지 본다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(FruitStackStompFlowTest.FixedSeed.class)
class FruitStackStompFlowTest {

    private static final String BOARD = "WAAAAGAPqA";

    @TestConfiguration
    static class FixedSeed {

        @Bean
        @Primary
        SeedSource fixedSeedSource() {
            return () -> new Seed(12345);
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

    // 판 신호는 길어야 1200자지만, 도둑잡기 흐름 테스트와 같은 넉넉한 글 버퍼를 쓴다.
    private static WebSocketStompClient createClient() {
        WebSocketContainer container = ContainerProvider.getWebSocketContainer();
        container.setDefaultMaxTextMessageBufferSize(256 * 1024);
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient(container));
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

    // 시작해 두 사람이 첫 화면을 받은(= 구독이 등록된) 방.
    private String startedRoom(Player host, Player guest) throws InterruptedException {
        String code = post("/api/rooms", Map.of("name", "과일 방", "gameType", "FRUIT_STACK"), host.cookie())
                .getBody().get("code").asText();
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        post("/api/rooms/" + code + "/ready", Map.of("ready", true), guest.cookie());
        post("/api/rooms/" + code + "/start", Map.of(), host.cookie());
        syncUntilView(host, code);
        syncUntilView(guest, code);
        return code;
    }

    private static Predicate<JsonNode> scoreIs(int seat, int score) {
        return view -> view.at("/game/players/" + seat + "/score").asInt() == score;
    }

    private void assertBoardFrom(JsonNode signal, Player sender) {
        assertThat(signal).isNotNull();
        assertThat(signal.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        assertThat(signal.get("type").asText()).isEqualTo("BOARD");
        assertThat(signal.get("playerId").asLong()).isEqualTo(sender.id());
        assertThat(signal.get("seq").asLong()).isEqualTo(1);
        assertThat(signal.get("board").asText()).isEqualTo(BOARD);
    }

    @Test
    void 시작하면_두_사람이_같은_씨앗과_시작_시각을_받는다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);

        JsonNode mine = syncUntilView(host, code);
        JsonNode theirs = syncUntilView(guest, code);

        for (JsonNode view : List.of(mine, theirs)) {
            assertThat(view.get("gameType").asText()).isEqualTo("FRUIT_STACK");
            assertThat(view.at("/game/seed").asInt()).isEqualTo(12345);
            assertThat(view.at("/game/deadline").asLong() - view.at("/game/startedAt").asLong()).isEqualTo(600000);
            assertThat(view.at("/game/players")).hasSize(2);
            assertThat(view.at("/game/players/0/state").asText()).isEqualTo("PLAYING");
            assertThat(view.at("/game/players/1/state").asText()).isEqualTo("PLAYING");
        }
        assertThat(theirs.at("/game/startedAt").asLong()).isEqualTo(mine.at("/game/startedAt").asLong());
    }

    @Test
    void R19_점수를_보고하면_두_사람_화면의_점수가_바뀌고_줄어든_점수는_보낸_사람만_거절당한다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);

        send(host, code, Map.of("type", "SCORE", "score", 30));
        JsonNode mine = awaitView(host, scoreIs(0, 30));
        JsonNode theirs = awaitView(guest, scoreIs(0, 30));
        assertThat(mine.at("/game/players/0/score").asInt()).isEqualTo(30);
        assertThat(theirs.at("/game/players/0/score").asInt()).isEqualTo(30);

        send(host, code, Map.of("type", "SCORE", "score", 10));

        JsonNode rejected = host.errors().poll(5, TimeUnit.SECONDS);
        assertThat(rejected).isNotNull();
        assertThat(rejected.get("status").asInt()).isEqualTo(409);
        assertThat(rejected.get("code").asText()).isEqualTo("FRUIT_STACK_SCORE_REJECTED");
        assertThat(rejected.get("message").asText()).isEqualTo("점수를 반영할 수 없어요.");
        assertThat(guest.errors().poll(500, TimeUnit.MILLISECONDS)).isNull();
        assertThat(syncUntilView(guest, code).at("/game/players/0/score").asInt()).isEqualTo(30);
    }

    @Test
    void R24_판_신호는_방의_모두에게_가고_관전자의_신호는_아무에게도_가지_않는다() throws Exception {
        Player host = player();
        Player guest = player();
        Player watcher = player();
        String code = startedRoom(host, guest);
        post("/api/rooms/" + code + "/watch", Map.of(), watcher.cookie());
        syncUntilView(watcher, code);

        signal(host, code, Map.of("type", "BOARD", "board", BOARD));

        assertBoardFrom(guest.signals().poll(5, TimeUnit.SECONDS), host);
        assertBoardFrom(watcher.signals().poll(5, TimeUnit.SECONDS), host);
        assertBoardFrom(host.signals().poll(5, TimeUnit.SECONDS), host);

        signal(watcher, code, Map.of("type", "BOARD", "board", BOARD));

        assertThat(guest.signals().poll(500, TimeUnit.MILLISECONDS)).isNull();
        assertThat(host.signals().poll(100, TimeUnit.MILLISECONDS)).isNull();
        assertThat(watcher.signals().poll(100, TimeUnit.MILLISECONDS)).isNull();
        assertThat(watcher.errors().poll(100, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void R26_한_사람이_탈락한_뒤_남은_사람의_점수가_넘는_순간_DECIDED로_끝난다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);

        send(guest, code, Map.of("type", "OUT", "score", 30));
        awaitView(host, view -> view.at("/game/players/1/state").asText().equals("OUT"));
        send(host, code, Map.of("type", "SCORE", "score", 30));
        JsonNode tied = awaitView(host, scoreIs(0, 30));
        assertThat(tied.at("/game/status").asText()).isEqualTo("IN_PROGRESS");

        send(host, code, Map.of("type", "SCORE", "score", 31));

        JsonNode over = awaitView(host, view -> view.at("/game/status").asText().equals("GAME_OVER"));
        assertThat(over.at("/game/result/reason").asText()).isEqualTo("DECIDED");
        assertThat(over.at("/game/winnerId").asLong()).isEqualTo(host.id());
        assertThat(over.at("/game/deadline").isNull()).isTrue();
        assertThat(host.errors().poll(100, TimeUnit.MILLISECONDS)).isNull();

        send(host, code, Map.of("type", "SCORE", "score", 40));

        JsonNode afterEnd = host.errors().poll(5, TimeUnit.SECONDS);
        assertThat(afterEnd).isNotNull();
        assertThat(afterEnd.get("code").asText()).isEqualTo("GAME_NOT_STARTED");
    }
}
