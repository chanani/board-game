package com.boardgame.emote;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
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
class EmoteStompFlowTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    private final WebSocketStompClient stompClient = createClient();

    private record Person(long id, String cookie, StompSession stomp,
                          BlockingQueue<JsonNode> emotes, BlockingQueue<JsonNode> errors) {
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

    private Person person() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Map<String, String> member = Map.of("loginId", "e" + suffix, "nickname", "e" + suffix.substring(0, 6),
                "password", "password1");
        rest.postForEntity("/api/members", member, JsonNode.class);
        ResponseEntity<JsonNode> login = rest.postForEntity("/api/auth/login",
                Map.of("loginId", "e" + suffix, "password", "password1"), JsonNode.class);
        String cookie = login.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, cookie);
        StompSession stomp = stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake,
                new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
        return new Person(login.getBody().get("id").asLong(), cookie, stomp,
                subscribe(stomp, "/user/queue/emote"), subscribe(stomp, "/user/queue/errors"));
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

    private String createRoom(Person host) {
        return post("/api/rooms", Map.of("name", "표정 방", "gameType", "UNO"), host.cookie())
                .getBody().get("code").asText();
    }

    private void emote(Person sender, String code, String emote) {
        sender.stomp().send("/app/rooms/" + code + "/emote", Map.of("emote", emote));
    }

    @Test
    void 참가자와_관전자의_표정은_방_사람_모두에게_가고_방_밖_사람에게는_가지_않는다() throws Exception {
        Person host = person();
        Person guest = person();
        Person watcher = person();
        Person outsider = person();
        String code = createRoom(host);
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        post("/api/rooms/" + code + "/ready", Map.of("ready", true), guest.cookie());
        post("/api/rooms/" + code + "/start", Map.of(), host.cookie());
        post("/api/rooms/" + code + "/watch", Map.of(), watcher.cookie());
        Thread.sleep(500);

        emote(host, code, "HEART_EYES");

        JsonNode received = guest.emotes().poll(5, TimeUnit.SECONDS);
        assertThat(received).isNotNull();
        assertThat(received.get("roomCode").asText()).isEqualTo(code);
        assertThat(received.get("memberId").asLong()).isEqualTo(host.id());
        assertThat(received.get("emote").asText()).isEqualTo("HEART_EYES");
        assertThat(received.get("id").asLong()).isPositive();
        assertThat(host.emotes().poll(5, TimeUnit.SECONDS)).isNotNull();
        assertThat(watcher.emotes().poll(5, TimeUnit.SECONDS)).isNotNull();

        emote(watcher, code, "LAUGH");

        JsonNode fromWatcher = host.emotes().poll(5, TimeUnit.SECONDS);
        assertThat(fromWatcher).isNotNull();
        assertThat(fromWatcher.get("memberId").asLong()).isEqualTo(watcher.id());
        assertThat(outsider.emotes().poll(1, TimeUnit.SECONDS)).isNull();

        emote(outsider, code, "SMILE");
        JsonNode outsiderError = outsider.errors().poll(5, TimeUnit.SECONDS);
        assertThat(outsiderError).isNotNull();
        assertThat(outsiderError.get("code").asText()).isEqualTo("NOT_IN_ROOM");
    }

    @Test
    void 없는_표정은_INVALID_EMOTE이고_아무에게도_가지_않는다() throws Exception {
        Person host = person();
        String code = createRoom(host);
        Thread.sleep(300);

        emote(host, code, "DANCE");

        JsonNode error = host.errors().poll(5, TimeUnit.SECONDS);
        assertThat(error).isNotNull();
        assertThat(error.get("status").asInt()).isEqualTo(400);
        assertThat(error.get("code").asText()).isEqualTo("INVALID_EMOTE");
        assertThat(error.get("message").asText()).isNotBlank();
        assertThat(host.emotes().poll(500, TimeUnit.MILLISECONDS)).isNull();
    }

    @Test
    void 잇달아_보낸_두_번째_표정은_EMOTE_TOO_FAST로_막고_잠시_뒤에는_다시_보낼_수_있다() throws Exception {
        Person host = person();
        String code = createRoom(host);
        Thread.sleep(300);

        emote(host, code, "SMILE");
        emote(host, code, "CRY");

        assertThat(host.emotes().poll(5, TimeUnit.SECONDS).get("emote").asText()).isEqualTo("SMILE");
        JsonNode error = host.errors().poll(5, TimeUnit.SECONDS);
        assertThat(error).isNotNull();
        assertThat(error.get("status").asInt()).isEqualTo(429);
        assertThat(error.get("code").asText()).isEqualTo("EMOTE_TOO_FAST");
        assertThat(host.emotes().poll(300, TimeUnit.MILLISECONDS)).isNull();

        Thread.sleep(1000);
        emote(host, code, "WINK");
        assertThat(host.emotes().poll(5, TimeUnit.SECONDS).get("emote").asText()).isEqualTo("WINK");
    }
}
