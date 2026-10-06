package com.boardgame.chat.application;

import com.boardgame.chat.api.ChatMessageResponse;
import com.boardgame.chat.domain.ChatAuthor;
import com.boardgame.chat.domain.ChatBody;
import com.boardgame.chat.domain.ChatMessage;
import com.boardgame.chat.domain.ChatRateLimiter;
import com.boardgame.chat.domain.ChatText;
import com.boardgame.chat.infra.ChatRegistry;
import com.boardgame.room.application.OccupantContext;
import com.boardgame.room.application.RoomService;
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.room.domain.RoomCode;
import java.time.Clock;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

// RoomService의 잠금 안에서 방 닫힘 이벤트가 오므로, 이 서비스는 자체 잠금을 잡지 않는다.
@Service
public class ChatService {

    private final RoomService roomService;
    private final ChatRegistry registry;
    private final ChatRateLimiter limiter;
    private final SimpMessagingTemplate messagingTemplate;
    private final Clock clock;
    private final AtomicLong ids = new AtomicLong();

    public ChatService(RoomService roomService, ChatRegistry registry, SimpMessagingTemplate messagingTemplate,
                       Clock clock) {
        this.roomService = roomService;
        this.registry = registry;
        this.limiter = new ChatRateLimiter(clock);
        this.messagingTemplate = messagingTemplate;
        this.clock = clock;
    }

    public void send(String rawCode, long memberId, String rawText) {
        String code = RoomCode.parse(rawCode).value();
        ChatText text = new ChatText(rawText);
        roomService.withOccupant(code, memberId, context -> deliver(code, memberId, text, context));
    }

    // 방 잠금 안에서 실행된다: 방 닫힘 정리와 겹쳐도 닫힌 방의 로그가 다시 생기지 않는다.
    private Void deliver(String code, long memberId, ChatText text, OccupantContext context) {
        limiter.require(memberId);
        ChatMessage message = new ChatMessage(ids.incrementAndGet(), new ChatAuthor(memberId, context.nickname()),
                new ChatBody(text, clock.instant()));
        registry.append(code, message);
        ChatMessageResponse payload = ChatMessageResponse.from(code, message);
        context.occupantIds().forEach(id -> messagingTemplate.convertAndSendToUser(String.valueOf(id),
                "/queue/chat", payload));
        return null;
    }

    public List<ChatMessage> history(String rawCode, long memberId) {
        String code = RoomCode.parse(rawCode).value();
        return roomService.withOccupant(code, memberId, context -> registry.messages(code));
    }

    public void clear(String code) {
        registry.remove(code);
    }

    @EventListener
    public void onRoomClosed(RoomClosedEvent event) {
        clear(event.code());
    }
}
