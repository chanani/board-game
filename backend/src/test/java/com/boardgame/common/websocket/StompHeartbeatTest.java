package com.boardgame.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.broker.SimpleBrokerMessageHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

// 하트비트가 0,0으로 협상되면 멈춘 연결을 아무도 알아채지 못한다(모바일에서 내 차례에 눌러도 반응이 없던 문제).
// 하트비트를 바라는 클라이언트에게 서버가 0이 아닌 값을 돌려주는지, 보낸 순서 보장이 켜져 있는지 확인한다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StompHeartbeatTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private SimpleBrokerMessageHandler broker;

    private final ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
    private final WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());

    @BeforeEach
    void setUp() {
        scheduler.initialize();
        stompClient.setTaskScheduler(scheduler);
        stompClient.setDefaultHeartbeat(WebSocketConfig.HEARTBEAT);
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
        scheduler.shutdown();
    }

    private String loginCookie() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Map<String, String> member = Map.of("loginId", "h" + suffix, "nickname", "h" + suffix.substring(0, 6),
                "password", "password1");
        rest.postForEntity("/api/members", member, JsonNode.class);
        ResponseEntity<JsonNode> login = rest.postForEntity("/api/auth/login",
                Map.of("loginId", "h" + suffix, "password", "password1"), JsonNode.class);
        return login.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
    }

    private StompHeaders connectedHeaders() throws Exception {
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, loginCookie());
        CompletableFuture<StompHeaders> connected = new CompletableFuture<>();
        stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake, new StompSessionHandlerAdapter() {
            @Override
            public void afterConnected(StompSession session, StompHeaders headers) {
                connected.complete(headers);
            }
        }).get(5, TimeUnit.SECONDS);
        return connected.get(5, TimeUnit.SECONDS);
    }

    @Test
    void 연결하면_서버가_0이_아닌_하트비트를_돌려준다() throws Exception {
        StompHeaders headers = connectedHeaders();

        assertThat(WebSocketConfig.HEARTBEAT).doesNotContain(0L);
        assertThat(headers.getHeartbeat()).containsExactly(WebSocketConfig.HEARTBEAT);
    }

    @Test
    void 한_사람에게_보낸_메시지는_보낸_순서대로_나간다() {
        assertThat(broker.isPreservePublishOrder()).isTrue();
    }
}
