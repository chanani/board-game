package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.websocket.ContainerProvider;
import jakarta.websocket.WebSocketContainer;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.uno.view.UnoSessionView;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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

// 실제 예약기(빠르게)로 사람 1명 + 컴퓨터 2명(하·상)이 STOMP로 한 게임을 끝까지 둔다. 사람은 하 머리의 자동 행동만 보낸다.
// 턴 타이머는 테스트의 가짜 예약기라 시간 초과로 진행되지 않는다: 끝까지 가려면 컴퓨터가 스스로 움직여야 한다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.bots.real-scheduler=true", "app.bots.pace=0.02"})
class BotStompFlowTest {

    private static final long GAME_LIMIT_MILLIS = 60_000;
    private static final long RESYNC_MILLIS = 2_000;

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BotBrains brains;

    @Autowired
    private GameMatchRepository matches;

    private final WebSocketStompClient stompClient = createClient();

    private record Player(long id, String cookie, StompSession stomp, BlockingQueue<JsonNode> views) {
    }

    // 손패가 긴 화면은 Tomcat 클라이언트 기본 글 버퍼(8KB)를 넘어 연결이 닫히므로 넉넉히 늘린다.
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

    @ParameterizedTest
    @EnumSource(GameType.class)
    void 사람_1명과_컴퓨터_2명이_게임을_끝까지_두고_기록은_남지_않는다(GameType type) throws Exception {
        long matchCount = matches.count();
        Player human = player();
        String code = post("/api/rooms", Map.of("name", "연습", "gameType", type.name()), human.cookie())
                .getBody()
                .get("code")
                .asText();
        assertThat(post("/api/rooms/" + code + "/bots", Map.of("difficulty", "EASY"), human.cookie())
                .getStatusCode()
                .is2xxSuccessful()).isTrue();
        assertThat(post("/api/rooms/" + code + "/bots", Map.of("difficulty", "HARD"), human.cookie())
                .getStatusCode()
                .is2xxSuccessful()).isTrue();

        ResponseEntity<JsonNode> started = post("/api/rooms/" + code + "/start", Map.of(), human.cookie());
        assertThat(started.getBody().get("practice").asBoolean()).isTrue();

        JsonNode last = playUntilGameOver(human, code, type);

        assertThat(last.at("/game/status").asText()).isEqualTo("GAME_OVER");
        assertThat(matches.count()).isEqualTo(matchCount);
        post("/api/rooms/" + code + "/leave", Map.of(), human.cookie());
    }

    // 사람은 받은 가장 최근 화면에 하 머리의 자동 행동(자기 차례가 아니면 빈 값)을 보낸다. 2초 동안 새 화면이 없으면 다시 받는다.
    private JsonNode playUntilGameOver(Player human, String code, GameType type) throws Exception {
        BotMind hand = brains.mind(type, BotDifficulty.EASY)
                .orElseThrow();
        Random random = new Random(42L);
        JsonNode view = syncUntilView(human, code);
        long limit = System.currentTimeMillis() + GAME_LIMIT_MILLIS;
        while (!isOver(view) && System.currentTimeMillis() < limit) {
            act(human, code, hand, view, type, random);
            view = nextView(human, code, view);
        }
        return view;
    }

    private void act(Player human, String code, BotMind hand, JsonNode view, GameType type, Random random)
            throws JsonProcessingException {
        Optional<GameAction> action = hand.fallback(read(view, type), random);
        action.ifPresent(chosen -> human.stomp().send("/app/rooms/" + code + "/actions", chosen));
    }

    private Object read(JsonNode view, GameType type) throws JsonProcessingException {
        return switch (type) {
            case PAPER_SAFARI -> objectMapper.treeToValue(view, PaperSafariSessionView.class);
            case UNO -> objectMapper.treeToValue(view, UnoSessionView.class);
            case OLD_MAID -> objectMapper.treeToValue(view, OldMaidSessionView.class);
        };
    }

    // 쌓인 화면 중 가장 최근 것. 2초 동안 없으면 sync로 다시 받는다.
    private JsonNode nextView(Player human, String code, JsonNode current) throws InterruptedException {
        JsonNode next = human.views().poll(RESYNC_MILLIS, TimeUnit.MILLISECONDS);
        if (next == null) {
            human.stomp().send("/app/rooms/" + code + "/sync", Map.of());
            next = human.views().poll(RESYNC_MILLIS, TimeUnit.MILLISECONDS);
        }
        if (next == null) {
            return current;
        }
        JsonNode newer = human.views().poll();
        while (newer != null) {
            next = newer;
            newer = human.views().poll();
        }
        return next;
    }

    private static boolean isOver(JsonNode view) {
        return view.at("/game/status").asText().equals("GAME_OVER");
    }

    // --- 아래 도우미는 UnoStompFlowTest에서 옮겼다 ---

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
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake, new StompSessionHandlerAdapter() {
                })
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
                subscribe(stomp, "/user/queue/game"));
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
}
