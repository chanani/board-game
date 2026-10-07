package com.boardgame.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.room.application.RoomNotifier;
import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.LongConsumer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.broker.OrderedMessageChannelDecorator;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.support.AbstractSubscribableChannel;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

// 한 회원이 탭 두 개로 동시에 접속해도 개인 큐(/user/queue/*) 메시지가 두 연결 모두에 닿아야 한다.
// 수신 순서 보장(setPreserveReceiveOrder)을 켜면 Spring이 같은 메시지를 세션마다 재사용하다
// 두 번째 세션에서 "Expected mutable SimpMessageHeaderAccessor"로 전송을 버리던 회귀를 막는다.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class MultiSessionUserQueueTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    @Autowired
    private RoomNotifier roomNotifier;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private AbstractSubscribableChannel clientInboundChannel;

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

    private String[] signUpAndLogin() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Map<String, String> member = Map.of("loginId", "m" + suffix, "nickname", "m" + suffix.substring(0, 6),
                "password", "password1");
        rest.postForEntity("/api/members", member, JsonNode.class);
        ResponseEntity<JsonNode> login = rest.postForEntity("/api/auth/login",
                Map.of("loginId", "m" + suffix, "password", "password1"), JsonNode.class);
        String cookie = login.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
        return new String[]{login.getBody().get("id").asText(), cookie};
    }

    private StompSession connect(String cookie) throws Exception {
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, cookie);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake, new StompSessionHandlerAdapter() {
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

    // 구독이 서버에 등록될 때까지 여러 번 보내고, 두 연결이 모두 받았는지 확인한다
    private void assertBothReceive(BlockingQueue<JsonNode> first, BlockingQueue<JsonNode> second,
                                   LongConsumer sender, long memberId) throws InterruptedException {
        for (int attempt = 0; attempt < 20; attempt++) {
            sender.accept(memberId);
            first.poll(250, TimeUnit.MILLISECONDS);
            second.poll(250, TimeUnit.MILLISECONDS);
        }
        sender.accept(memberId);
        assertThat(first.poll(2, TimeUnit.SECONDS)).as("첫 번째 탭").isNotNull();
        assertThat(second.poll(2, TimeUnit.SECONDS)).as("두 번째 탭").isNotNull();
    }

    @Test
    void 수신_순서_보장은_그대로_켜져_있다() {
        assertThat(OrderedMessageChannelDecorator.supportsOrderedMessages(clientInboundChannel)).isTrue();
    }

    @Test
    void 한_회원이_두_연결을_열면_개인_게임_큐_메시지를_두_연결_모두_받는다() throws Exception {
        String[] credentials = signUpAndLogin();
        long memberId = Long.parseLong(credentials[0]);
        BlockingQueue<JsonNode> firstTab = subscribe(connect(credentials[1]), "/user/queue/game");
        BlockingQueue<JsonNode> secondTab = subscribe(connect(credentials[1]), "/user/queue/game");

        assertBothReceive(firstTab, secondTab, id -> roomNotifier.gameUpdated(id, Map.of("phase", "TEST")), memberId);
    }

    @Test
    void 한_회원이_두_연결을_열면_개인_신호_큐_메시지를_두_연결_모두_받는다() throws Exception {
        String[] credentials = signUpAndLogin();
        long memberId = Long.parseLong(credentials[0]);
        BlockingQueue<JsonNode> firstTab = subscribe(connect(credentials[1]), "/user/queue/signal");
        BlockingQueue<JsonNode> secondTab = subscribe(connect(credentials[1]), "/user/queue/signal");

        assertBothReceive(firstTab, secondTab, id -> messagingTemplate.convertAndSendToUser(
                String.valueOf(id), "/queue/signal", Map.of("index", 0)), memberId);
    }
}
